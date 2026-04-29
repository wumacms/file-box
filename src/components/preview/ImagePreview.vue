<template>
  <div class="w-full h-full flex items-center justify-center">
    <img 
      :src="optimizedUrl" 
      class="max-w-[95vw] max-h-[90vh] object-contain transition-all duration-300 drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
      loading="lazy"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { IFileItem } from '../../providers/type';
import { useImageBoxStore } from '../../stores/imageBox';

const props = defineProps<{
  file: IFileItem;
}>();

const store = useImageBoxStore();

const optimizedUrl = computed(() => {
  if (store.provider && props.file.category === 'image') {
    return store.provider.getProcessUrl(props.file.path, { width: 1200 });
  }
  return props.file.url;
});
</script>
