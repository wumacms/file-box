import { ref, onUnmounted } from 'vue';

export function useResizable(initialWidth = 288, minWidth = 200, maxWidth = 800) {
  const width = ref(initialWidth);
  const isResizing = ref(false);

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.value) return;
    width.value = Math.min(Math.max(e.clientX, minWidth), maxWidth);
  };

  const stopResize = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const startResize = () => {
    isResizing.value = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  onUnmounted(() => {
    if (isResizing.value) {
      stopResize();
    }
  });

  return {
    width,
    isResizing,
    startResize
  };
}
