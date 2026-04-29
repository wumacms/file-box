<template>
  <div class="w-full h-full flex items-center justify-center">
    <div class="bg-gray-800/80 backdrop-blur-md p-16 rounded-3xl border border-white/10 flex flex-col items-center space-y-8 shadow-2xl max-w-md w-full">
      <div 
        class="w-32 h-32 rounded-3xl flex items-center justify-center mb-2 shadow-inner"
        :class="theme.bg"
      >
        <el-icon :size="64" :class="theme.text">
          <component :is="theme.icon" />
        </el-icon>
      </div>
      
      <div class="text-center space-y-2">
        <h3 class="text-white font-bold text-xl break-all px-4">{{ file.name }}</h3>
        <p class="text-gray-400 text-sm">该文件格式暂不支持直接预览</p>
      </div>

      <div class="flex space-x-4 w-full">
        <el-button 
          type="primary" 
          size="large" 
          class="flex-1 !rounded-2xl !h-14 font-bold"
          @click="handleDownload"
        >
          <el-icon class="mr-2"><Download /></el-icon>下载文件
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Document, Download, Files, Reading, VideoCamera, Headset } from '@element-plus/icons-vue';
import type { IFileItem } from '../../providers/type';

const props = defineProps<{
  file: IFileItem;
}>();

const theme = computed(() => {
  const type = props.file.type;
  if (type.startsWith('video/')) return { icon: VideoCamera, bg: 'bg-orange-500/20', text: 'text-orange-400' };
  if (type.startsWith('audio/')) return { icon: Headset, bg: 'bg-purple-500/20', text: 'text-purple-400' };
  if (type.includes('pdf')) return { icon: Reading, bg: 'bg-red-500/20', text: 'text-red-400' };
  if (type.includes('zip') || type.includes('rar')) return { icon: Files, bg: 'bg-yellow-500/20', text: 'text-yellow-400' };
  
  return { icon: Document, bg: 'bg-gray-500/20', text: 'text-gray-400' };
});

const handleDownload = async () => {
  try {
    const response = await fetch(props.file.url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = props.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    window.open(props.file.url, '_blank');
  }
};
</script>
