<template>
  <div class="w-full h-full">
    <component :is="previewComponent" :file="file" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { IFileItem } from '../../providers/type';
import ImagePreview from './ImagePreview.vue';
import VideoPreview from './VideoPreview.vue';
import AudioPreview from './AudioPreview.vue';
import PDFPreview from './PDFPreview.vue';
import TextPreview from './TextPreview.vue';
import CSVPreview from './CSVPreview.vue';
import MarkdownPreview from './MarkdownPreview.vue';
import HTMLPreview from './HTMLPreview.vue';
import DefaultPreview from './DefaultPreview.vue';

const props = defineProps<{
  file: IFileItem;
}>();

const previewComponent = computed(() => {
  switch (props.file.category) {
    case 'image':
      return ImagePreview;
    case 'video':
      return VideoPreview;
    case 'audio':
      return AudioPreview;
    case 'pdf':
      return PDFPreview;
    case 'code':
      return TextPreview;
    case 'csv':
      return CSVPreview;
    case 'markdown':
      return MarkdownPreview;
    case 'html':
      return HTMLPreview;
    default:
      return DefaultPreview;
  }
});
</script>
