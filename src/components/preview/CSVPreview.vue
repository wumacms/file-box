<template>
  <div class="w-full h-full flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-4xl h-[80vh] bg-[#282c34] rounded-2xl border border-white/10 flex flex-col shadow-2xl overflow-hidden">
      <!-- Toolbar -->
      <div class="h-12 bg-black/20 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
        <div class="flex items-center space-x-2">
          <el-icon class="text-green-600"><Document /></el-icon>
          <span class="text-gray-300 text-sm font-medium">{{ file.name }}</span>
        </div>
        <div class="flex items-center space-x-3">
          <span class="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase font-bold tracking-widest">
            CSV 表格
          </span>
          <el-radio-group v-model="mode" size="small" class="custom-radio-group">
            <el-radio-button value="table">数据表</el-radio-button>
            <el-radio-button value="source">原始文本</el-radio-button>
          </el-radio-group>
          <div class="h-4 w-px bg-white/10 mx-1"></div>
          <el-button 
            type="primary" 
            link 
            size="small" 
            class="!text-gray-400 hover:!text-white transition-colors !px-0"
            :class="{ '!text-green-400': copied }"
            @click="handleCopy"
            :disabled="loading || !rawContent"
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
      <div class="flex-1 overflow-hidden relative bg-[#282c34]">
        <div v-if="loading" class="w-full h-full flex items-center justify-center absolute inset-0 z-10">
          <el-skeleton :rows="10" animated variant="p" class="opacity-20 px-6" />
        </div>
        
        <template v-else>
          <el-table 
            v-if="mode === 'table'"
            :data="tableData" 
            border 
            stripe 
            height="100%"
            style="width: 100%"
            class="csv-table custom-scrollbar"
          >
            <el-table-column 
              v-for="col in columns" 
              :key="col" 
              :prop="col" 
              :label="col" 
              min-width="150"
              show-overflow-tooltip
            />
          </el-table>

          <div v-else class="w-full h-full overflow-auto p-6 bg-[#282c34] custom-scrollbar">
            <pre class="hljs font-mono text-sm leading-relaxed whitespace-pre"><code v-html="highlightedCode"></code></pre>
          </div>
        </template>

        <div v-if="!loading && tableData.length === 0 && mode === 'table'" class="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <el-icon :size="48"><Files /></el-icon>
          <p class="mt-2 text-sm">暂无数据或解析失败</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Document, CopyDocument, Check, Files } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { IFileItem } from '../../providers/type';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';

const props = defineProps<{
  file: IFileItem;
}>();

const rawContent = ref('');
const tableData = ref<any[]>([]);
const columns = ref<string[]>([]);
const loading = ref(true);
const copied = ref(false);
const mode = ref<'table' | 'source'>('source');

const highlightedCode = computed(() => {
  if (!rawContent.value) return '';
  try {
    const result = hljs.highlightAuto(rawContent.value);
    return result.value;
  } catch (e) {
    return rawContent.value;
  }
});

const parseCSV = (csv: string) => {
  try {
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    // Enhanced CSV parser to handle quotes and escaped quotes
    const parseLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const header = parseLine(lines[0]);
    columns.value = header.map((h, i) => h || `Column ${i + 1}`);

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: any = {};
      columns.value.forEach((col, index) => {
        row[col] = values[index] || '';
      });
      data.push(row);
    }
    tableData.value = data;
  } catch (err) {
    console.error('CSV Parse Error:', err);
    tableData.value = [];
  }
};

onMounted(async () => {
  try {
    const response = await fetch(props.file.url);
    rawContent.value = await response.text();
    parseCSV(rawContent.value);
  } catch (error) {
    ElMessage.error('无法加载 CSV 内容');
  } finally {
    loading.value = false;
  }
});

const handleCopy = async () => {
  if (!rawContent.value || copied.value) return;
  try {
    await navigator.clipboard.writeText(rawContent.value);
    copied.value = true;
    ElMessage({
      message: '原始内容已复制',
      type: 'success',
      plain: true
    });
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    ElMessage.error('复制失败');
  }
};
</script>

<script lang="ts">
export default {
  name: 'CSVPreview'
};
</script>

<style scoped>
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

.hljs {
  background: transparent !important;
  padding: 0 !important;
}

.csv-table {
  --el-table-border-color: rgba(255, 255, 255, 0.05);
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  background-color: transparent !important;
}

.csv-table :deep(.el-table__header-wrapper) th {
  background-color: rgba(0, 0, 0, 0.2) !important;
  color: #94a3b8 !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  height: 48px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.csv-table :deep(.el-table__row) td {
  font-size: 13px !important;
  color: #cbd5e1 !important;
  background-color: #282c34 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.csv-table :deep(.el-table__row--striped) td {
  background-color: #23272e !important;
}

.csv-table :deep(.el-table__body-wrapper) {
  background-color: transparent;
}
</style>
