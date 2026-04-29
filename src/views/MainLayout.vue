<template>
  <template v-if="store.provider">
    <Toolbar @toggle-sidebar="$emit('toggle-sidebar')" />
    <ImageGrid />
  </template>
  
  <!-- No Config Guide -->
  <div v-else class="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
    <div class="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-6">
      <el-icon :size="40"><Warning /></el-icon>
    </div>
    <h2 class="text-2xl font-bold text-gray-800 mb-2">欢迎使用 Image Box</h2>
    <p class="text-gray-500 max-w-md mb-8">
      您尚未配置阿里云 OSS 存储桶或当前未选中任何存储桶。请先前往系统设置添加。
    </p>
    <el-button type="primary" size="large" class="!rounded-xl px-8" @click="router.push('/settings')">
      立即配置 OSS
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { useImageBoxStore } from '../stores/imageBox';
import { useRouter } from 'vue-router';
import Toolbar from '../components/Toolbar.vue';
import ImageGrid from '../components/ImageGrid.vue';
import { Warning } from '@element-plus/icons-vue';

const store = useImageBoxStore();
const router = useRouter();

defineEmits(['toggle-sidebar']);
</script>
