<template>
  <div class="w-full h-full flex items-center justify-center">
    <div class="bg-gray-800/80 backdrop-blur-md p-12 rounded-3xl border border-white/10 flex flex-col items-center space-y-6 shadow-2xl">
      <div class="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center">
        <el-icon :size="48" class="text-purple-400"><Headset /></el-icon>
      </div>
      <div class="text-center">
        <h3 class="text-white font-medium text-lg mb-1">{{ file.name }}</h3>
        <p class="text-gray-400 text-sm">音频文件预览</p>
      </div>
      <audio controls autoplay class="w-80" :src="file.url">
        您的浏览器不支持 audio 标签。
      </audio>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Headset } from '@element-plus/icons-vue';
import type { IFileItem } from '../../providers/type';

defineProps<{
  file: IFileItem;
}>();
</script>
