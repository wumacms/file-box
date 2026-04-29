<template>
  <div v-loading="store.loading" class="flex-1 overflow-y-auto bg-white p-6 flex flex-col relative">
    <template v-if="store.folders.length > 0 || store.files.length > 0">
      <!-- Folders Section -->
      <div v-if="store.folders.length > 0" class="mb-8">
      <div class="flex items-center mb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
        <span>目录 ({{ store.folders.length }})</span>
        <div class="ml-4 flex-1 h-px bg-gray-100"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <div 
          v-for="folder in store.folders" 
          :key="folder.path"
          class="group relative flex items-center p-3 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer"
          @click="store.changeDirectory(folder.path)"
        >
          <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg text-blue-500 mr-3">
            <el-icon :size="24"><Folder /></el-icon>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-700 truncate">{{ folder.name }}</p>
          </div>
          
          <!-- Delete Button -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <el-button 
              type="danger" 
              link 
              size="small" 
              @click.stop="handleDeleteFolder(folder.path)"
            >
              <template #icon><el-icon><Delete /></el-icon></template>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Files Section -->
    <div v-if="store.files.length > 0">
      <div class="flex items-center mb-4 text-xs font-bold text-gray-400 uppercase tracking-wider h-8">
        <span class="shrink-0">资源文件 ({{ store.files.length }})</span>
        
        <div class="ml-4 flex-1 h-px bg-gray-100"></div>

        <!-- Combined Actions Group -->
        <div class="ml-auto flex items-center space-x-3 shrink-0 ml-4">
          <!-- Selection Actions -->
          <transition name="el-fade-in">
            <div v-if="store.selectedFiles.length > 0" class="flex items-center bg-blue-50/80 px-2 py-0.5 rounded-lg border border-blue-100 shrink-0">
              <span class="text-[10px] font-bold text-blue-600 mr-2 hidden sm:inline">已选 {{ store.selectedFiles.length }}</span>
              <el-button-group>
                <el-button 
                  type="primary" 
                  size="small" 
                  link
                  class="!px-2 hover:bg-blue-100"
                  @click="moveDialogVisible = true"
                >
                  <el-icon class="mr-1"><Rank /></el-icon>移动
                </el-button>
                <el-button 
                  type="danger" 
                  size="small" 
                  link
                  class="!px-2 hover:bg-red-50"
                  @click="handleDeleteSelected"
                >
                  <el-icon class="mr-1"><Delete /></el-icon>删除
                </el-button>
              </el-button-group>
            </div>
          </transition>

          <!-- Mode Controls -->
          <div class="flex items-center space-x-2">
            <template v-if="store.isEditMode">
              <el-button size="small" link @click="store.selectAll" class="text-blue-600">全选</el-button>
              <el-button size="small" link @click="store.clearSelection" class="text-gray-500">取消全选</el-button>
              <el-button size="small" type="primary" class="!rounded-lg" @click="store.toggleEditMode">退出管理</el-button>
            </template>
            <el-button 
              v-else 
              size="small" 
              type="primary" 
              plain
              class="!rounded-full !bg-blue-50 !border-blue-200 !px-4 hover:!bg-blue-100 transition-all duration-300 group"
              @click="store.toggleEditMode"
            >
              <el-icon class="mr-1.5 group-hover:scale-110 transition-transform"><CircleCheck /></el-icon>
              <span class="font-bold">批量管理</span>
            </el-button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        <div 
          v-for="(file, index) in store.files" 
          :key="file.path"
          class="relative flex flex-col items-center group cursor-pointer"
        >
          <div 
            class="relative w-full aspect-square bg-gray-50 rounded-xl overflow-hidden border-2 transition-all shadow-sm"
            :class="store.selectedFiles.includes(file.path) ? 'border-blue-500 ring-4 ring-blue-50' : 'border-transparent hover:border-blue-200'"
            @click="store.isEditMode ? store.toggleSelection(file.path) : previewFile(index)"
          >
            <!-- File Content (Thumbnail or Icon) -->
            <template v-if="file.category === 'image'">
              <img 
                :src="file.thumbnail || file.url" 
                class="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            </template>
            <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gray-50/50 group-hover:bg-gray-100/50 transition-colors">
              <div 
                class="w-16 h-16 rounded-2xl flex items-center justify-center mb-1 shadow-sm transition-transform group-hover:scale-110"
                :class="getFileTheme(file.type, file.category).bg"
              >
                <el-icon :size="32" :class="getFileTheme(file.type, file.category).text">
                  <component :is="getFileTheme(file.type, file.category).icon" />
                </el-icon>
              </div>
              <span class="text-[10px] font-bold text-gray-400 tracking-widest uppercase">{{ getFileExt(file.name) }}</span>
            </div>
            
            <!-- Selection Overlay / Checkbox -->
            <div 
              v-if="store.isEditMode || store.selectedFiles.includes(file.path)"
              class="absolute top-2 left-2 w-6 h-6 rounded-lg flex items-center justify-center transition-colors shadow-lg"
              :class="store.selectedFiles.includes(file.path) ? 'bg-blue-500 text-white' : 'bg-white text-gray-300 border border-gray-200'"
            >
              <el-icon><Check /></el-icon>
            </div>

            <!-- Hover Actions (Hidden in Edit Mode) -->
            <div v-if="!store.isEditMode" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
              <div class="space-x-3 flex">
                <!-- Primary Action: Preview -->
                <el-button 
                  circle 
                  class="!w-9 !h-9 !bg-white/90 !border-none hover:!bg-white shadow-lg transform active:scale-95 transition-all"
                  @click.stop="previewFile(index)"
                >
                  <template #icon><el-icon :size="18"><View /></el-icon></template>
                </el-button>

                <!-- More Actions Dropdown -->
                <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, file)">
                  <el-button 
                    circle 
                    class="!w-9 !h-9 !bg-white/90 !border-none hover:!bg-white shadow-lg transform active:scale-95 transition-all"
                    @click.stop
                  >
                    <template #icon><el-icon :size="18"><MoreFilled /></el-icon></template>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="copy">
                        <el-icon><Link /></el-icon>复制链接
                      </el-dropdown-item>
                      <el-dropdown-item command="download">
                        <el-icon><Download /></el-icon>下载文件
                      </el-dropdown-item>
                      <el-dropdown-item command="rename">
                        <el-icon><Edit /></el-icon>重命名
                      </el-dropdown-item>
                      <el-dropdown-item command="info" divided>
                        <el-icon><InfoFilled /></el-icon>文件详情
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
          <span class="mt-2 text-xs font-medium text-gray-700 truncate w-full text-center px-1">{{ file.name }}</span>
        </div>
      </div>
    </div>
    </template>
    
    <!-- Empty State -->
    <EmptyState v-else-if="!store.loading" />
  </div>

  <!-- File Preview Fullscreen Overlay -->
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="previewVisible" 
        class="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center overflow-hidden"
        @keydown.stop="handleKeydown"
      >
        <!-- Dynamic Previewer (z-20 to be above background click area) -->
        <div class="w-full h-full flex items-center justify-center z-20" @click.stop>
          <FilePreviewer 
            v-if="store.files[currentIndex]" 
            :key="store.files[currentIndex].path"
            :file="store.files[currentIndex]" 
          />
        </div>
        
        <!-- Navigation Buttons -->
        <div v-if="currentIndex > 0" class="absolute left-6 top-1/2 -translate-y-1/2 z-20">
          <el-button circle class="!bg-white/10 !border-none !text-white hover:!bg-white/20 !w-16 !h-16 shadow-2xl" @click.stop="showPrev">
            <el-icon :size="32"><ArrowLeft /></el-icon>
          </el-button>
        </div>
        <div v-if="currentIndex < store.files.length - 1" class="absolute right-6 top-1/2 -translate-y-1/2 z-20">
          <el-button circle class="!bg-white/10 !border-none !text-white hover:!bg-white/20 !w-16 !h-16 shadow-2xl" @click.stop="showNext">
            <el-icon :size="32"><ArrowRight /></el-icon>
          </el-button>
        </div>

        <!-- Header Toolbar (Always visible but subtle) -->
        <div class="absolute top-0 left-0 right-0 h-20 px-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent z-30 pointer-events-none">
          <div class="text-white text-sm font-medium truncate max-w-md pointer-events-auto">
            {{ store.files[currentIndex]?.name }}
            <span class="text-gray-300/60 ml-2">({{ currentIndex + 1 }} / {{ store.files.length }})</span>
          </div>
          <div class="flex items-center space-x-3 pointer-events-auto">
            <el-button circle class="!bg-white/10 !border-none !text-white hover:!bg-white/20 transition-all" @click.stop="copyUrl(store.files[currentIndex]?.url)" title="复制链接">
              <el-icon :size="20"><Link /></el-icon>
            </el-button>
            <el-button circle class="!bg-white/10 !border-none !text-white hover:!bg-white/20 transition-all" @click.stop="handleDownload(store.files[currentIndex]?.url, store.files[currentIndex]?.name)" title="下载">
              <el-icon :size="20"><Download /></el-icon>
            </el-button>
            <el-button circle class="!bg-white/10 !border-none !text-white hover:!bg-white/20 transition-all" @click.stop="closePreview" title="退出 (Esc)">
              <el-icon :size="20"><Close /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- Background Click to Close -->
        <div class="absolute inset-0 z-10" @click="closePreview"></div>
      </div>
    </Transition>
  </Teleport>

  <!-- File Info Drawer -->
  <el-drawer
    v-model="infoVisible"
    title="文件详情"
    size="380px"
    class="info-drawer"
    destroy-on-close
  >
    <div v-if="selectedFileInfo" class="p-2 space-y-6">
      <!-- Preview / Icon in Drawer -->
      <div class="w-full bg-gray-50 rounded-2xl p-4 flex items-center justify-center min-h-[160px] border border-gray-100">
        <template v-if="selectedFileInfo.category === 'image'">
          <img :src="selectedFileInfo.url" class="max-w-full max-h-40 rounded-lg shadow-sm" />
        </template>
        <div v-else class="flex flex-col items-center">
          <div 
            class="w-20 h-20 rounded-2xl flex items-center justify-center mb-2 shadow-sm"
            :class="getFileTheme(selectedFileInfo.type, selectedFileInfo.category).bg"
          >
            <el-icon :size="40" :class="getFileTheme(selectedFileInfo.type, selectedFileInfo.category).text">
              <component :is="getFileTheme(selectedFileInfo.type, selectedFileInfo.category).icon" />
            </el-icon>
          </div>
          <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ getFileExt(selectedFileInfo.name) }}</span>
        </div>
      </div>

      <!-- Details List -->
      <div class="space-y-4">
        <div class="info-item">
          <div class="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">文件名</div>
          <div class="text-sm font-medium text-gray-700 break-all leading-relaxed">{{ selectedFileInfo.name }}</div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="info-item">
            <div class="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">文件大小</div>
            <div class="text-sm font-medium text-gray-700">{{ formatSize(selectedFileInfo.size) }}</div>
          </div>
          <div class="info-item">
            <div class="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">内容类型</div>
            <div class="text-sm font-medium text-gray-700">{{ selectedFileInfo.type || '未知' }}</div>
          </div>
        </div>

        <div class="info-item">
          <div class="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">存储路径</div>
          <div class="text-xs font-mono bg-gray-50 p-2 rounded-lg text-gray-500 break-all border border-gray-100">{{ selectedFileInfo.path }}</div>
        </div>

        <div class="info-item">
          <div class="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">最后修改</div>
          <div class="text-sm font-medium text-gray-700">{{ new Date(selectedFileInfo.createdAt || Date.now()).toLocaleString() }}</div>
        </div>
      </div>

      <!-- Quick Actions in Drawer -->
      <div class="pt-6 flex space-x-2">
        <el-button class="flex-1 !rounded-xl" @click="copyUrl(selectedFileInfo.url)">复制链接</el-button>
        <el-button class="flex-1 !rounded-xl" type="primary" @click="handleDownload(selectedFileInfo.url, selectedFileInfo.name)">下载</el-button>
      </div>
    </div>
  </el-drawer>

  <!-- Move To Dialog -->
  <el-dialog 
    v-model="moveDialogVisible" 
    title="移动到目录" 
    width="400px" 
    class="rounded-2xl"
    append-to-body
  >
    <div class="py-2">
      <p class="text-xs text-gray-400 mb-3 px-1">请选择目标位置：</p>
      <div class="max-h-64 overflow-y-auto border border-gray-100 rounded-xl p-2 custom-scrollbar">
        <el-tree
          v-if="moveDialogVisible"
          ref="treeRef"
          :props="treeProps"
          :load="loadNode"
          lazy
          node-key="path"
          highlight-current
          :expand-on-click-node="false"
          @current-change="handleNodeClick"
        >
          <template #default="{ node, data }">
            <div class="flex items-center space-x-2 w-full pr-4">
              <el-icon :class="targetPath === data.path ? 'text-blue-500' : 'text-gray-400'">
                <HomeFilled v-if="data.path === ''" />
                <Folder v-else />
              </el-icon>
              <span class="text-sm truncate" :class="targetPath === data.path ? 'text-blue-600 font-medium' : 'text-gray-700'">
                {{ node.label }}
              </span>
            </div>
          </template>
        </el-tree>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end space-x-2">
        <el-button @click="moveDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!targetPath || targetPath === store.currentPath" @click="handleMove">
          立即移动
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useImageBoxStore } from '../stores/imageBox';
import { 
  Folder, Check, View, Link, Delete, Edit, Rank, HomeFilled, CircleCheck,
  Picture, VideoCamera, Headset, Document, Files, Reading, Download, MoreFilled, InfoFilled,
  ArrowLeft, ArrowRight, Close, Grid
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { IFileItem } from '../providers/type';
import EmptyState from './EmptyState.vue';
import FilePreviewer from './preview/FilePreviewer.vue';

const store = useImageBoxStore();
const previewVisible = ref(false);
const currentIndex = ref(-1);
const infoVisible = ref(false);
const selectedFileInfo = ref<IFileItem | null>(null);
const moveDialogVisible = ref(false);
const targetPath = ref('');

const treeProps = {
  label: 'name',
  children: 'children',
  isLeaf: 'leaf',
};

const previewFile = (index: number) => {
  currentIndex.value = index;
  previewVisible.value = true;
  document.body.style.overflow = 'hidden';
};

const closePreview = () => {
  previewVisible.value = false;
  document.body.style.overflow = '';
};

const showNext = () => {
  if (currentIndex.value < store.files.length - 1) {
    currentIndex.value++;
  }
};

const showPrev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (!previewVisible.value) return;
  if (e.key === 'ArrowRight') showNext();
  if (e.key === 'ArrowLeft') showPrev();
  if (e.key === 'Escape') closePreview();
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const handleCommand = (command: string, file: IFileItem) => {
  switch (command) {
    case 'copy':
      copyUrl(file.url);
      break;
    case 'download':
      handleDownload(file.url, file.name);
      break;
    case 'rename':
      handleRename(file);
      break;
    case 'info':
      selectedFileInfo.value = file;
      infoVisible.value = true;
      break;
  }
};

const handleDownload = async (url: string, name: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    // Fallback to open in new tab if blob fetch fails (e.g. CORS)
    window.open(url, '_blank');
  }
};

const copyUrl = async (url: string) => {
  if (!url) {
    ElMessage.warning('链接无效');
    return;
  }
  
  const doCopy = async (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  };

  try {
    const success = await doCopy(url);
    if (success) {
      ElMessage.success({
        message: '链接已复制到剪贴板',
        duration: 2000,
        grouping: true
      });
    } else {
      throw new Error('Copy command failed');
    }
  } catch (err) {
    console.error('Copy failed:', err);
    ElMessage.error('复制失败，请尝试右键手动复制');
  }
};

const handleRename = async (file: IFileItem) => {
  try {
    const { value: newName } = await ElMessageBox.prompt('请输入新的文件名', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: file.name,
      inputPattern: /^.+\..+$/,
      inputErrorMessage: '文件名格式不正确（需包含扩展名）',
    });
    
    if (newName && newName !== file.name) {
      await store.renameImage(file.path, newName);
      ElMessage.success('重命名成功');
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '重命名失败');
    }
  }
};

const handleDeleteFolder = async (path: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要永久删除该目录及所有文件吗？',
      '安全提示',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
        type: 'warning',
      }
    );
    await store.deleteFolder(path);
    ElMessage.success('目录已清理');
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '操作失败');
    }
  }
};

const handleDeleteSelected = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${store.selectedFiles.length} 个文件吗？`, '批量删除', {
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    });
    await store.deleteSelected();
    ElMessage.success('删除成功');
  } catch (err) {
    // Cancelled
  }
};

const handleNodeClick = (data: any) => {
  targetPath.value = data.path;
};

const handleMove = async () => {
  if (!targetPath.value) return;
  try {
    await store.moveSelectedImages(targetPath.value);
    ElMessage.success('移动成功');
    moveDialogVisible.value = false;
    targetPath.value = '';
  } catch (err: any) {
    ElMessage.error(err.message || '移动失败');
  }
};

const loadNode = async (node: any, resolve: (data: any[]) => void) => {
  if (node.level === 0) {
    if (!store.user) return resolve([]);
    return resolve([{ name: '根目录 (/)', path: '' }]);
  }
  
  if (!store.provider) return resolve([]);
  
  try {
    const { folders } = await store.provider.list(node.data.path);
    const nodes = folders.map(f => ({
      name: f.name,
      path: f.path,
      leaf: false
    }));
    resolve(nodes);
  } catch (error) {
    console.error('Failed to load folders:', error);
    resolve([]);
  }
};

// File Type Helpers
const getFileExt = (name: string) => {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
};

const getFileTheme = (_type?: string, category?: string) => {
  if (category === 'image') return { icon: Picture, bg: 'bg-teal-50', text: 'text-teal-500' };
  if (category === 'video') return { icon: VideoCamera, bg: 'bg-orange-50', text: 'text-orange-500' };
  if (category === 'audio') return { icon: Headset, bg: 'bg-purple-50', text: 'text-purple-500' };
  if (category === 'pdf') return { icon: Reading, bg: 'bg-red-50', text: 'text-red-500' };
  if (category === 'archive') return { icon: Files, bg: 'bg-yellow-50', text: 'text-yellow-600' };
  if (category === 'code') return { icon: Document, bg: 'bg-blue-50', text: 'text-blue-500' };
  if (category === 'csv') return { icon: Grid, bg: 'bg-emerald-50', text: 'text-emerald-500' };
  if (category === 'markdown') return { icon: Reading, bg: 'bg-indigo-50', text: 'text-indigo-500' };
  if (category === 'html') return { icon: Document, bg: 'bg-orange-50', text: 'text-orange-500' };
  
  return { icon: Document, bg: 'bg-gray-100', text: 'text-gray-400' };
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.preview-dialog :deep(.el-dialog__body) {
  padding: 10px;
  background: #1a1a1a;
}

:deep(.el-dialog) {
  background: transparent;
  box-shadow: none;
}

.info-drawer :deep(.el-drawer__body) {
  padding: 0 20px 20px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
