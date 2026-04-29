export type FileCategory = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'archive' | 'code' | 'csv' | 'markdown' | 'html' | 'other';

export interface IFileItem {
  id: string;
  user_id?: string;
  name: string;
  url: string;      // 原始文件 URL
  thumbnail?: string; // 缩略图 (仅图片/视频可能存在)
  path: string;
  size: number;
  type: string;     // MIME Type
  category: FileCategory;
  metadata?: any;
  createdAt: string;
}

export interface IFolderItem {
  name: string;
  path: string; // 绝对路径，如 "userId/images/work/"
}

export interface IStorageProvider {
  // 获取目录下的文件和文件夹
  list(path: string): Promise<{ files: IFileItem[], folders: IFolderItem[] }>;
  
  // 上传文件
  upload(file: File, path: string, onProgress?: (p: number) => void): Promise<IFileItem>;
  
  // 删除文件/文件夹
  delete(paths: string[]): Promise<void>;
  
  // 移动文件/文件夹 (支持批量)
  move(sourcePaths: string[], targetPath: string): Promise<void>;

  // 重命名文件/文件夹
  rename(oldPath: string, newName: string): Promise<void>;
  
  // 复制文件/文件夹 (支持批量)
  copy(sourcePaths: string[], targetPath: string): Promise<void>;

  // 更新文件元数据 (如标签、描述)
  updateMetadata(path: string, metadata: Partial<IFileItem>): Promise<void>;
  
  // 创建文件夹
  createFolder(path: string): Promise<void>;

  // 删除文件夹及其内容
  deleteFolder(path: string): Promise<void>;

  // 搜索文件 (跨目录)
  search(query: string): Promise<IFileItem[]>;

  // 获取处理后的图片 URL (如缩略图)
  getProcessUrl(path: string, options: { width?: number; height?: number }): string;
  getSignatureUrl(path: string): string;
  getStats(): Promise<{ totalSize: number; count: number }>;
}
