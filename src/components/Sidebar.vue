<template>
  <aside 
    :style="{ width: isMobile ? '280px' : `${width}px` }" 
    class="bg-gray-50 border-r border-gray-100 flex shadow-2xl md:shadow-sm relative flex-shrink-0 transition-transform duration-300 md:transition-[width] md:duration-75 ease-in-out z-50 fixed md:relative h-full inset-y-0 left-0"
    :class="showMobile ? 'translate-x-0 flex-col' : '-translate-x-full md:translate-x-0 hidden md:flex md:flex-col'"
  >
    <div class="p-4 pb-4 shrink-0">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <el-icon class="text-white" :size="24"><Box /></el-icon>
        </div>
        <h1 class="text-xl font-bold tracking-tight text-gray-800">File Box</h1>
      </div>
    </div>
    
    <div class="flex-1 overflow-hidden">
      <FolderTree />
    </div>
    
    <!-- User Info & Settings at bottom -->
    <div class="shrink-0 p-6 border-t border-gray-100 bg-white/50">
      <div class="flex items-center space-x-3 mb-4">
        <el-avatar :size="32" class="bg-blue-100 text-blue-600 font-bold">
          {{ store.user?.email?.[0].toUpperCase() }}
        </el-avatar>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-700 truncate">{{ store.user?.email }}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <el-button size="small" class="!rounded-lg" @click="$emit('open-settings')">
          <el-icon class="mr-1"><Setting /></el-icon>设置
        </el-button>
        <el-button size="small" type="danger" plain class="!rounded-lg" @click="$emit('logout')">
          退出
        </el-button>
      </div>
    </div>
    
    <!-- Resizer Handle (Desktop only) -->
    <div 
      class="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400 active:bg-blue-500 transition-colors z-50 hidden md:block"
      @mousedown.prevent="startResize"
    ></div>
  </aside>
</template>

<script setup lang="ts">
import { useImageBoxStore } from '../stores/imageBox';
import FolderTree from './FolderTree.vue';
import { Box, Setting } from '@element-plus/icons-vue';
import { useResizable } from '../composables/useResizable';

defineProps<{
  isMobile: boolean;
  showMobile: boolean;
}>();

defineEmits<{
  (e: 'open-settings'): void;
  (e: 'logout'): void;
}>();

const store = useImageBoxStore();
const { width, startResize } = useResizable(320, 200, 800);
</script>
