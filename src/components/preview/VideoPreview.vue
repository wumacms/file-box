<template>
  <div class="w-full h-full flex items-center justify-center p-10">
    <video 
      ref="videoRef"
      controls 
      autoplay
      class="max-w-full max-h-full rounded-lg shadow-2xl bg-black"
      :src="file.url"
    >
      您的浏览器不支持 video 标签。
    </video>
  </div>
</template>

<script setup lang="ts">
// import { ref } from 'vue';
import type { IFileItem } from '../../providers/type';

defineProps<{
  file: IFileItem;
}>();

// videoRef is currently unused but kept for future features (like playback control)
// const videoRef = ref<HTMLVideoElement | null>(null);
</script>
