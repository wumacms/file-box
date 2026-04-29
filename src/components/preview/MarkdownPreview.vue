<template>
  <div class="w-full h-full flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-4xl h-[80vh] bg-[#282c34] rounded-2xl border border-white/10 flex flex-col shadow-2xl overflow-hidden">
      <!-- Toolbar -->
      <div class="h-12 bg-black/20 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
        <div class="flex items-center space-x-2">
          <el-icon class="text-blue-400"><Reading /></el-icon>
          <span class="text-gray-300 text-sm font-medium">{{ file.name }}</span>
        </div>
        <div class="flex items-center space-x-3">
          <el-radio-group v-model="mode" size="small" class="custom-radio-group">
            <el-radio-button value="preview">预览</el-radio-button>
            <el-radio-button value="source">源码</el-radio-button>
          </el-radio-group>
          <div class="h-4 w-px bg-white/10 mx-1"></div>
          <el-button 
            type="primary" 
            link 
            size="small" 
            class="!text-gray-400 hover:!text-white transition-colors !px-0"
            :class="{ '!text-green-400': copied }"
            @click="handleCopy"
            :disabled="loading || !content"
          >
            <el-icon class="mr-1">
              <Check v-if="copied" />
              <CopyDocument v-else />
            </el-icon>
            <span class="text-xs">{{ copied ? '已复制' : '复制原文' }}</span>
          </el-button>
        </div>
      </div>
      
      <!-- Content Area -->
      <div class="flex-1 overflow-auto p-6 custom-scrollbar bg-[#282c34]">
        <div v-if="loading" class="w-full h-full flex items-center justify-center">
          <el-skeleton :rows="10" animated variant="p" class="opacity-20" />
        </div>
        
        <div v-else-if="mode === 'preview'" class="markdown-body max-w-3xl mx-auto" v-html="renderedHtml"></div>
        
        <pre 
          v-else 
          class="hljs font-mono text-sm leading-relaxed whitespace-pre"
        ><code v-html="highlightedCode"></code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Reading, CopyDocument, Check } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { IFileItem } from '../../providers/type';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import MarkdownIt from 'markdown-it';
import 'github-markdown-css/github-markdown-dark.css';

import { copyToClipboard } from '../../utils/clipboard';

const props = defineProps<{
  file: IFileItem;
}>();

const mode = ref<'preview' | 'source'>('source');
const content = ref('');
const loading = ref(true);
const copied = ref(false);

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ''; // use external default escaping
  }
});

const renderedHtml = computed(() => {
  return md.render(content.value);
});

const highlightedCode = computed(() => {
  if (!content.value) return '';
  try {
    const result = hljs.highlightAuto(content.value);
    return result.value;
  } catch (e) {
    return content.value;
  }
});

onMounted(async () => {
  try {
    const response = await fetch(props.file.url);
    content.value = await response.text();
  } catch (error) {
    content.value = '无法加载文件内容。';
  } finally {
    loading.value = false;
  }
});

const handleCopy = async () => {
  if (!content.value || copied.value) return;
  const success = await copyToClipboard(content.value);
  if (success) {
    copied.value = true;
    ElMessage.success('原始内容已复制');
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } else {
    ElMessage.error('复制失败');
  }
};
</script>

<style scoped>
.markdown-body {
  box-sizing: border-box;
  min-width: 200px;
  background-color: transparent !important;
}

.custom-radio-group :deep(.el-radio-button__inner) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}

.custom-radio-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
  box-shadow: -1px 0 0 0 #3b82f6;
}

.hljs {
  background: transparent !important;
  padding: 0 !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  border: 2px solid #282c34;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
