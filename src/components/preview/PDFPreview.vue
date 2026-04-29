<template>
  <div class="w-full h-full flex flex-col items-center justify-center p-4">
    <div class="w-full h-full bg-white rounded-lg overflow-hidden shadow-2xl relative flex flex-col">
      <!-- Top Action Bar -->
      <div class="h-10 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div class="flex items-center space-x-2 text-gray-500 text-xs">
          <el-icon><Document /></el-icon>
          <span>PDF 预览模式</span>
        </div>
        <el-button type="primary" link size="small" @click="openInNewTab">
          <el-icon class="mr-1"><Position /></el-icon>全屏查看
        </el-button>
      </div>

      <!-- PDF Viewer Area -->
      <div v-loading="loading" class="flex-1 w-full h-full bg-gray-50 flex items-center justify-center">
        <template v-if="!loading && blobUrl">
          <embed 
            :src="blobUrl" 
            type="application/pdf" 
            class="w-full h-full"
          />
        </template>
        <div v-if="error" class="text-center p-4">
          <p class="text-red-500 text-sm mb-2">{{ error }}</p>
          <el-button size="small" @click="loadPdf">重试</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Document, Position } from '@element-plus/icons-vue';
import type { IFileItem } from '../../providers/type';

const props = defineProps<{
  file: IFileItem;
}>();

const blobUrl = ref('');
const loading = ref(true);
const error = ref('');

const loadPdf = async () => {
  loading.value = true;
  error.value = '';
  try {
    const response = await fetch(props.file.url);
    if (!response.ok) throw new Error('网络响应异常');
    const blob = await response.blob();
    // 强制指定 MIME 类型为 pdf
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    blobUrl.value = URL.createObjectURL(pdfBlob);
  } catch (err) {
    console.error('PDF Load Error:', err);
    error.value = 'PDF 加载失败，可能是由于跨域限制 (CORS)。';
  } finally {
    loading.value = false;
  }
};

const openInNewTab = () => {
  if (blobUrl.value) {
    window.open(blobUrl.value, '_blank');
  } else {
    window.open(props.file.url, '_blank');
  }
};

onMounted(() => {
  loadPdf();
});

onUnmounted(() => {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value);
  }
});
</script>
