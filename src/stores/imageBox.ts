import { defineStore } from 'pinia';
import type { IFileItem, IFolderItem, IStorageProvider } from '../providers/type';
import { supabase } from '../utils/supabase';
import { getFileCategory } from '../utils/file';

interface ImageBoxState {
  currentPath: string;
  files: IFileItem[];
  folders: IFolderItem[];
  selectedFiles: string[];
  loading: boolean;
  isEditMode: boolean;
  provider: IStorageProvider | null;
  user: any | null;
}

export const useImageBoxStore = defineStore('imageBox', {
  state: (): ImageBoxState => ({
    currentPath: '',
    files: [],
    folders: [],
    selectedFiles: [],
    loading: false,
    isEditMode: false,
    provider: null,
    user: null,
  }),

  actions: {
    setProvider(provider: IStorageProvider | null) {
      this.provider = provider;
      // Clear data when provider changes to avoid showing stale data from previous bucket
      this.files = [];
      this.folders = [];
      this.selectedFiles = [];
      this.isEditMode = false;
    },

    setUser(user: any) {
      // 只有当原先有用户，且新旧 ID 不同时，才认为是“切换用户”
      const isUserSwitched = this.user && user && this.user.id !== user.id;
      this.user = user;
      
      if (user) {
        const savedPath = localStorage.getItem(`image_box_path_${user.id}`);
        
        if (isUserSwitched) {
          // 只有真正换人了，才重置
          this.currentPath = '';
          localStorage.removeItem(`image_box_path_${user.id}`);
        } else if (!this.currentPath) {
          // 首次加载或刷新，尝试恢复
          this.currentPath = savedPath || '';
        }
      } else {
        this.currentPath = '';
      }
    },

    async fetchCurrentDirectory() {
      if (!this.provider) return;
      this.loading = true;
      const currentProvider = this.provider;
      const currentPath = this.currentPath;
      
      try {
        const { files, folders } = await this.provider.list(this.currentPath);
        
        // If provider or path changed during fetch, ignore the result
        if (this.provider !== currentProvider || this.currentPath !== currentPath) return;

        this.files = files;
        this.folders = folders;
        this.selectedFiles = [];
        this.isEditMode = false;
        
        // 路径变化时保存到 localStorage (仅当有用户时)
        if (this.user) {
          localStorage.setItem(`image_box_path_${this.user.id}`, this.currentPath);
        }
      } catch (error) {
        // If provider changed, we don't care about the error from the old one
        if (this.provider === currentProvider) {
          console.error('Failed to fetch directory:', error);
        }
      } finally {
        if (this.provider === currentProvider) {
          this.loading = false;
        }
      }
    },

    async changeDirectory(path: string) {
      this.currentPath = path;
      await this.fetchCurrentDirectory();
    },

    toggleSelection(path: string) {
      const index = this.selectedFiles.indexOf(path);
      if (index > -1) {
        this.selectedFiles.splice(index, 1);
      } else {
        this.selectedFiles.push(path);
      }
    },

    async uploadFiles(files: FileList) {
      if (!this.provider || !this.user) return;
      this.loading = true;
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileItem = await this.provider.upload(file, this.currentPath);
          
          // 同步到 Supabase 数据库
          await supabase.from('images').insert({
            user_id: this.user.id,
            name: fileItem.name,
            path: fileItem.path,
            url: fileItem.url,
            size: fileItem.size,
            type: fileItem.type,
            category: fileItem.category,
            metadata: { lastModified: file.lastModified }
          });
        }
        await this.fetchCurrentDirectory();
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        this.loading = false;
      }
    },

    async deleteSelected() {
      if (!this.provider || this.selectedFiles.length === 0) return;
      this.loading = true;
      try {
        const pathsToDelete = [...this.selectedFiles];
        await this.provider.delete(pathsToDelete);
        
        // 同步从数据库删除
        await supabase
          .from('images')
          .delete()
          .in('path', pathsToDelete);

        this.selectedFiles = [];
        await this.fetchCurrentDirectory();
      } catch (error) {
        console.error('Delete failed:', error);
      } finally {
        this.loading = false;
      }
    },

    async deleteFolder(path: string) {
      if (!this.provider) return;
      this.loading = true;
      try {
        await this.provider.deleteFolder(path);
        
        // 数据库清理
        await supabase
          .from('images')
          .delete()
          .like('path', `${path}%`);

        await this.fetchCurrentDirectory();
      } catch (error) {
        console.error('Delete folder failed:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async searchImages(query: string) {
      if (!query) {
        await this.fetchCurrentDirectory();
        return;
      }
      this.loading = true;
      try {
        const { data, error } = await supabase
          .from('images')
          .select('*')
          .ilike('name', `%${query}%`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        this.files = (data || []).map(item => ({
          id: item.id,
          name: item.name,
          url: this.provider!.getSignatureUrl(item.path),
          thumbnail: item.category === 'image' ? this.provider!.getProcessUrl(item.path, { width: 200 }) : undefined,
          user_id: item.user_id,
          path: item.path,
          size: item.size,
          type: item.type,
          category: item.category || getFileCategory(item.type, item.name),
          metadata: item.metadata,
          createdAt: item.created_at
        }));
        this.folders = [];
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        this.loading = false;
      }
    },

    async createNewFolder(name: string) {
      if (!this.provider) return;
      const path = `${this.currentPath}${name}/`;
      await this.provider.createFolder(path);
      await this.fetchCurrentDirectory();
    },

    async renameImage(imagePath: string, newName: string) {
      if (!this.provider) return;
      this.loading = true;
      try {
        const pathParts = imagePath.split('/');
        pathParts.pop();
        const newPath = [...pathParts, newName].join('/');
        
        if (imagePath === newPath) return;

        // 1. OSS 重命名
        await this.provider.rename(imagePath, newName);
        
        // 2. 同步更新数据库
        await supabase
          .from('images')
          .update({
            name: newName,
            path: newPath,
            url: this.provider.getSignatureUrl(newPath)
          })
          .eq('path', imagePath);

        await this.fetchCurrentDirectory();
      } catch (error) {
        console.error('Rename failed:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async moveSelectedImages(targetPath: string) {
      if (!this.provider || this.selectedFiles.length === 0) return;
      this.loading = true;
      try {
        const pathsToMove = [...this.selectedFiles];
        const normalizedTarget = targetPath.endsWith('/') ? targetPath : `${targetPath}/`;

        // 1. OSS 批量移动
        await this.provider.move(pathsToMove, normalizedTarget);
        
        // 2. 同步更新数据库每一项
        for (const oldPath of pathsToMove) {
          const fileName = oldPath.split('/').pop()!;
          const newPath = `${normalizedTarget}${fileName}`;
          
          await supabase
            .from('images')
            .update({
              path: newPath,
              url: this.provider.getSignatureUrl(newPath)
            })
            .eq('path', oldPath);
        }

        this.selectedFiles = [];
        await this.fetchCurrentDirectory();
      } catch (error) {
        console.error('Move failed:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async convertFile(file: IFileItem, targetFormat: string) {
      if (!this.provider || !this.user) return;
      this.loading = true;
      try {
        const newFile = await this.provider.convert(file.path, targetFormat);
        
        // 同步到 Supabase 数据库
        await supabase.from('images').insert({
          user_id: this.user.id,
          name: newFile.name,
          path: newFile.path,
          url: newFile.url,
          size: newFile.size,
          type: newFile.type,
          category: newFile.category,
          metadata: { ...file.metadata, convertedFrom: file.path }
        });

        await this.fetchCurrentDirectory();
      } catch (error) {
        console.error('Conversion failed:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    toggleEditMode() {
      this.isEditMode = !this.isEditMode;
      if (!this.isEditMode) {
        this.selectedFiles = [];
      }
    },

    selectAll() {
      this.selectedFiles = this.files.map(file => file.path);
    },

    clearSelection() {
      this.selectedFiles = [];
    }
  }
});
