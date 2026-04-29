import OSS from 'ali-oss';
import type { IFileItem, IFolderItem, IStorageProvider } from './type';
import { getFileCategory } from '../utils/file';

export class OSSProvider implements IStorageProvider {
  private client: OSS | null = null;

  constructor(options: OSS.Options) {
    this.client = new OSS(options);
  }

  async list(path: string): Promise<{ files: IFileItem[]; folders: IFolderItem[] }> {
    if (!this.client) throw new Error('OSS Client not initialized');
    
    const result = await this.client.list({
      prefix: path,
      delimiter: '/',
      'max-keys': 1000
    } as any, {});

    const folders: IFolderItem[] = (result.prefixes || []).map(p => ({
      name: p.replace(path, '').replace('/', ''),
      path: p
    }));

    const files: IFileItem[] = (result.objects || [])
      .filter(obj => obj.name !== path) // 过滤掉目录本身
      .map(obj => {
        const name = obj.name.split('/').pop() || '';
        // 简单通过后缀获取 mime type，生产环境建议从 OSS 响应头获取
        const ext = name.split('.').pop()?.toLowerCase() || '';
        const category = getFileCategory('', name);
        
        return {
          id: obj.name,
          name,
          url: this.client!.signatureUrl(obj.name, { expires: 3600 }),
          thumbnail: category === 'image' ? this.getProcessUrl(obj.name, { width: 200 }) : undefined,
          path: obj.name,
          size: obj.size,
          type: ext === 'html' ? 'text/html' : (ext ? `application/${ext}` : 'application/octet-stream'), // 修正 HTML 类型
          category,
          createdAt: obj.lastModified
        };
      });

    return { files, folders };
  }

  async upload(file: File, path: string, onProgress?: (p: number) => void): Promise<IFileItem> {
    if (!this.client) throw new Error('OSS Client not initialized');
    
    const fullPath = `${path}${Date.now()}-${file.name}`;
    const result = await this.client.put(fullPath, file, {
      progress: (p: number) => {
        if (onProgress) onProgress(p * 100);
      }
    } as any);

    const category = getFileCategory(file.type, file.name);

    return {
      id: result.name,
      name: result.name.split('/').pop() || '',
      url: this.client.signatureUrl(result.name, { expires: 3600 }),
      thumbnail: category === 'image' ? this.getProcessUrl(result.name, { width: 200 }) : undefined,
      path: result.name,
      size: file.size,
      type: file.type,
      category,
      createdAt: new Date().toISOString()
    };
  }

  async delete(paths: string[]): Promise<void> {
    if (!this.client) throw new Error('OSS Client not initialized');
    await this.client.deleteMulti(paths);
  }

  async move(sourcePaths: string[], targetPath: string): Promise<void> {
    if (!this.client) throw new Error('OSS Client not initialized');
    // 确保目标路径以 / 结尾
    const normalizedTarget = targetPath.endsWith('/') ? targetPath : `${targetPath}/`;
    
    for (const source of sourcePaths) {
      const fileName = source.split('/').pop()!;
      const target = `${normalizedTarget}${fileName}`;
      if (source === target) continue;

      await this.client.copy(target, source);
      await this.client.delete(source);
    }
  }

  async rename(oldPath: string, newName: string): Promise<void> {
    if (!this.client) throw new Error('OSS Client not initialized');
    const pathParts = oldPath.split('/');
    pathParts.pop(); // 移除旧文件名
    const newPath = [...pathParts, newName].join('/');
    
    if (oldPath === newPath) return;

    await this.client.copy(newPath, oldPath);
    await this.client.delete(oldPath);
  }

  async copy(sourcePaths: string[], targetPath: string): Promise<void> {
    if (!this.client) throw new Error('OSS Client not initialized');
    for (const source of sourcePaths) {
      const fileName = source.split('/').pop();
      const dest = `${targetPath}${fileName}`;
      await this.client.copy(dest, source);
    }
  }

  async updateMetadata(_path: string, _metadata: Partial<IFileItem>): Promise<void> {
    // 占位符
  }

  async createFolder(path: string): Promise<void> {
    if (!this.client) throw new Error('OSS Client not initialized');
    const folderPath = path.replace(/\/+$/, '') + '/';
    await this.client.put(folderPath, new Blob([]));
  }

  async deleteFolder(path: string): Promise<void> {
    if (!this.client) throw new Error('OSS Client not initialized');
    let nextMarker: string | undefined = undefined;
    do {
      const result: any = await this.client.list({ 
        prefix: path, 
        marker: nextMarker,
        'max-keys': 1000
      } as any, {});
      const paths = (result.objects || []).map((obj: any) => obj.name);
      if (paths.length > 0) {
        await this.delete(paths);
      }
      nextMarker = result.nextMarker;
    } while (nextMarker);
  }

  async search(_query: string): Promise<IFileItem[]> {
    return [];
  }

  getProcessUrl(path: string, options: { width?: number; height?: number }): string {
    if (!this.client) return '';
    let process = 'image/resize';
    if (options.width) process += `,w_${options.width}`;
    if (options.height) process += `,h_${options.height}`;
    
    // 返回带签名的处理后 URL
    return this.client.signatureUrl(path, {
      expires: 3600,
      process
    });
  }

  getSignatureUrl(path: string): string {
    if (!this.client) return '';
    return this.client.signatureUrl(path, { expires: 3600 });
  }

  async getStats(): Promise<{ totalSize: number; count: number }> {
    return { totalSize: 0, count: 0 };
  }

  async checkConnection(): Promise<void> {
    if (!this.client) throw new Error('OSS 客户端未初始化');
    // 尝试获取文件列表（设置 max-keys 为 1 以减少开销）
    await this.client.list({ 'max-keys': 1 } as any, {});
  }
}
