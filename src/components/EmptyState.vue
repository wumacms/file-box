<template>
  <div class="flex-1 flex flex-col items-center justify-center min-h-[400px] w-full h-full">
    <el-empty :description="message" class="opacity-80">
      <template #image>
        <div class="w-32 h-32 bg-blue-50 rounded-full flex items-center justify-center mb-4 mx-auto">
          <el-icon :size="48" class="text-blue-200"><PictureRounded /></el-icon>
        </div>
      </template>
      <div class="mt-4 flex flex-col items-center space-y-4">
        <p class="text-sm text-gray-400">可以上传图片，或者新建目录来整理您的文件</p>
        <el-button type="primary" size="large" class="!rounded-xl shadow-lg shadow-blue-100/50 hover:-translate-y-0.5 transition-transform" @click="handleUploadClick">
          <el-icon class="mr-2"><UploadFilled /></el-icon>
          立即上传
        </el-button>
      </div>
    </el-empty>

    <!-- Hidden file input for uploading from empty state -->
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { PictureRounded, UploadFilled } from '@element-plus/icons-vue';
import { useImageBoxStore } from '../stores/imageBox';
import { ElMessage } from 'element-plus';

defineProps({
  message: {
    type: String,
    default: '当前目录为空，还没有任何图片'
  }
});

const store = useImageBoxStore();
const fileInput = ref<HTMLInputElement | null>(null);

const handleUploadClick = () => {
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files;
  if (files && files.length > 0) {
    try {
      await store.uploadFiles(files);
      ElMessage.success(`成功上传 ${files.length} 张图片`);
    } catch (err: any) {
      ElMessage.error(err.message || '上传失败');
    }
  }
};
</script>
