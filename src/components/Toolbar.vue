<template>
  <div class="h-16 border-b border-gray-100 flex items-center justify-between px-3 md:px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10 w-full">
    <!-- Left: Navigation & Actions -->
    <div class="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0 pr-2">
      <el-button class="md:!hidden !px-2 !py-2 shrink-0" @click="emit('toggle-sidebar')" text>
        <el-icon :size="20"><Expand /></el-icon>
      </el-button>
      
      <!-- Breadcrumb container with hidden scrollbar -->
      <div class="flex-1 min-w-0 overflow-x-auto no-scrollbar flex items-center">
        <el-breadcrumb separator="/" class="whitespace-nowrap flex-nowrap flex items-center">
          <el-breadcrumb-item @click="store.changeDirectory('')">
            <span class="cursor-pointer hover:text-blue-600 font-medium transition-colors">全部文件</span>
          </el-breadcrumb-item>
          <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index">
            <span 
              class="cursor-pointer hover:text-blue-600 transition-colors"
              :class="index === breadcrumbs.length - 1 ? 'text-gray-700 font-medium' : 'text-gray-400'"
              @click="store.changeDirectory(item.path)"
            >
              {{ item.name }}
            </span>
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>
    </div>

    <!-- Right: Search & Upload -->
    <div class="flex items-center space-x-2 md:space-x-3 ml-2 flex-shrink-0">
      <!-- Selection actions moved to ImageGrid.vue -->

      <el-input
        v-model="searchQuery"
        placeholder="搜索文件..."
        class="!hidden sm:!flex !w-32 md:!w-64 search-input items-center"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-button type="primary" class="!rounded-xl shadow-md shadow-blue-100 !px-3 sm:!px-4" @click="handleUploadClick">
        <el-icon class="sm:mr-1.5"><Upload /></el-icon>
        <span class="hidden sm:inline">上传</span>
      </el-button>
      
      <el-button class="!rounded-xl !px-3 md:!px-4" @click="folderDialogVisible = true">
        <el-icon class="md:mr-1.5"><FolderAdd /></el-icon>
        <span class="hidden md:inline">新建目录</span>
      </el-button>
    </div>

    <!-- Hidden File Input -->
    <input
      ref="fileInput"
      type="file"
      multiple
      class="hidden"
      @change="handleFileChange"
    />

    <!-- New Folder Dialog -->
    <el-dialog v-model="folderDialogVisible" title="新建目录" width="400px" class="rounded-2xl" append-to-body>
      <el-form label-position="top">
        <el-form-item label="目录名称">
          <el-input v-model="newFolderName" placeholder="请输入目录名称" autofocus />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="folderDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateFolder">确认创建</el-button>
      </template>
    </el-dialog>

    <!-- Move To Dialog moved to ImageGrid.vue -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useImageBoxStore } from '../stores/imageBox';
import { Search, Upload, FolderAdd, Expand } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { debounce } from '../utils/debounce';

const emit = defineEmits(['toggle-sidebar']);

const store = useImageBoxStore();
const searchQuery = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const folderDialogVisible = ref(false);
const newFolderName = ref('');

const breadcrumbs = computed(() => {
  const isIsolated = store.user && store.currentPath.startsWith(`${store.user.id}/`);
  const rootPrefix = isIsolated ? `${store.user.id}/` : '';
  const relativePath = store.currentPath.replace(rootPrefix, '');
  
  if (!relativePath) return [];
  
  const parts = relativePath.split('/').filter(Boolean);
  let current = rootPrefix;
  return parts.map(part => {
    current += part + '/';
    return {
      name: part,
      path: current
    };
  });
});

const handleSearch = debounce(() => {
  store.searchImages(searchQuery.value);
}, 300);

const handleUploadClick = () => {
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files;
  if (files && files.length > 0) {
    await store.uploadFiles(files);
    ElMessage.success(`成功上传 ${files.length} 个文件`);
  }
};

const handleCreateFolder = async () => {
  if (!newFolderName.value) return;
  try {
    await store.createNewFolder(newFolderName.value);
    ElMessage.success('目录创建成功');
    folderDialogVisible.value = false;
    newFolderName.value = '';
  } catch (err: any) {
    ElMessage.error(err.message || '创建目录失败');
  }
};
</script>

<style scoped>
.search-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  background-color: #f9fafb;
  box-shadow: none !important;
  border: 1px solid #f3f4f6;
}
.search-input :deep(.el-input__wrapper.is-focus) {
  background-color: white;
  border-color: #3b82f6;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
