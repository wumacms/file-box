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
    
    // 自动重命名逻辑：检测同名文件并添加 (n) 后缀
    let finalName = file.name;
    const dotIndex = file.name.lastIndexOf('.');
    const baseName = dotIndex > -1 ? file.name.substring(0, dotIndex) : file.name;
    const ext = dotIndex > -1 ? file.name.substring(dotIndex) : '';
    
    let counter = 1;
    let exists = true;
    
    while (exists) {
      try {
        const checkPath = `${path}${finalName}`;
        // 使用 head 检查文件是否存在
        await this.client.head(checkPath);
        // 如果没报错，说明文件已存在，增加序号继续探测
        finalName = `${baseName} (${counter})${ext}`;
        counter++;
        // 防止极端情况死循环（如 100 次冲突后放弃）
        if (counter > 100) throw new Error('文件名冲突过多，请手动重命名');
      } catch (err: any) {
        // 状态码 404 或 NoSuchKey 表示文件不存在，名称可用
        if (err.status === 404 || err.name === 'NoSuchKeyError') {
          exists = false;
        } else {
          throw err;
        }
      }
    }

    const fullPath = `${path}${finalName}`;
    const result = await this.client.put(fullPath, file, {
      progress: (p: number) => {
        if (onProgress) onProgress(p * 100);
      }
    } as any);

    const category = getFileCategory(file.type, finalName);

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

  getProcessUrl(path: string, options: { width?: number; height?: number; format?: string }): string {
    if (!this.client) return '';
    let process = 'image';
    
    if (options.width || options.height) {
      process += '/resize';
      if (options.width) process += `,w_${options.width}`;
      if (options.height) process += `,h_${options.height}`;
    }

    if (options.format) {
      // 如果已经有了 resize，需要用 / 分隔，否则直接用 /format
      process += (process === 'image' ? '/format' : '/format') + `,${options.format}`;
    }

    // 处理特殊情况：如果没有 resize 也没有 format，默认 resize
    if (process === 'image') process = 'image/resize,w_200';
    
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

  async convert(path: string, targetFormat: string): Promise<IFileItem> {
    if (!this.client) throw new Error('OSS 客户端未初始化');
    
    const fileName = path.split('/').pop() || '';
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const targetPath = path.replace(fileName, `${nameWithoutExt}.${targetFormat}`);
    
    // 方案改进：由于某些版本的 OSS Browser SDK 可能缺少 processObject 方法，
    // 我们采用“云端处理后下载并上传”的策略。
    // 这仍然利用了 OSS 的云端转码能力（不消耗客户端 CPU）。
    
    try {
      // 1. 获取转码后的带签名 URL
      const processUrl = this.getProcessUrl(path, { format: targetFormat });
      
      // 2. Fetch 该 URL 获取 Blob (云端在这里完成转码)
      const response = await fetch(processUrl);
      if (!response.ok) throw new Error(`云端转码失败: ${response.statusText}`);
      const blob = await response.blob();
      
      // 3. 将转换后的 Blob 上传回 OSS
      const result = await this.client.put(targetPath, blob);
      
      // 4. 获取文件元数据
      const headResult = await this.client.head(targetPath);
      const headers = headResult.res.headers as any;
      const category = getFileCategory(`image/${targetFormat}`, targetPath);
      
      return {
        id: result.name,
        name: result.name.split('/').pop() || '',
        url: this.client.signatureUrl(result.name, { expires: 3600 }),
        thumbnail: this.getProcessUrl(result.name, { width: 200 }),
        path: result.name,
        size: blob.size,
        type: `image/${targetFormat}`,
        category,
        createdAt: headers['last-modified'] || new Date().toISOString()
      };
    } catch (error: any) {
      console.error('AVIF Conversion failed:', error);
      throw new Error(`转换失败: ${error.message}`);
    }
  }

  async checkConnection(): Promise<void> {
    if (!this.client) throw new Error('OSS 客户端未初始化');
    // 尝试获取文件列表（设置 max-keys 为 1 以减少开销）
    await this.client.list({ 'max-keys': 1 } as any, {});
  }
}
