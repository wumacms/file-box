<template>
  <div class="h-full bg-gray-50 py-4 px-4 flex flex-col">
    <div class="flex items-center justify-between mb-4 text-gray-700 font-medium shrink-0">
      <div class="flex items-center space-x-2">
        <el-icon><Fold /></el-icon>
        <span>存储桶及资源</span>
      </div>
      <el-button 
        type="primary" 
        link 
        :icon="Refresh" 
        @click="refreshTree"
        class="!p-0"
      />
    </div>

    <div class="mb-4 shrink-0">
      <el-select 
        v-model="bucketsStore.activeBucketId" 
        placeholder="请选择存储桶" 
        class="w-full"
        @change="handleBucketChange"
      >
        <el-option
          v-for="bucket in bucketsStore.buckets"
          :key="bucket.id"
          :label="bucket.name"
          :value="bucket.id"
        >
          <span class="flex items-center">
            <el-icon class="mr-2"><Box /></el-icon>
            {{ bucket.name }}
          </span>
        </el-option>
      </el-select>
    </div>

    <!-- 未选择存储桶时的提示 -->
    <div v-if="!bucketsStore.activeBucketId" class="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-2 px-4 text-center">
      <el-icon :size="48"><Box /></el-icon>
      <p class="text-sm">请先选择一个存储桶</p>
    </div>

    <!-- 目录树 -->
    <div class="flex-1 overflow-auto no-scrollbar" v-if="store.provider">
      <el-tree
        ref="treeRef"
        :props="defaultProps"
        :load="loadNode"
        lazy
        node-key="path"
        highlight-current
        :indent="12"
        @node-click="handleNodeClick"
        class="bg-transparent"
        :key="treeKey"
      >
        <template #default="{ data }">
          <span class="flex items-center space-x-2 text-sm py-1">
            <el-icon :class="data.path === '' ? 'text-blue-500' : 'text-blue-400'">
              <HomeFilled v-if="data.path === ''" />
              <Folder v-else />
            </el-icon>
            <span :class="store.currentPath === data.path ? 'text-blue-600 font-medium' : 'text-gray-700'">{{ data.name }}</span>
          </span>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useImageBoxStore } from '../stores/imageBox';
import { useBucketsStore } from '../stores/buckets';
import { Folder, Fold, HomeFilled, Box, Refresh } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';

const store = useImageBoxStore();
const bucketsStore = useBucketsStore();
const router = useRouter();
const treeRef = ref();
const treeKey = ref(0);

const refreshTree = () => {
  treeKey.value++;
  store.fetchCurrentDirectory();
};

const defaultProps = {
  children: 'children',
  label: 'name',
  isLeaf: 'leaf',
};

const handleBucketChange = async () => {
  // The watcher in App.vue will handle re-instantiating the provider and resetting the path
  if (router.currentRoute.value.path !== '/') {
    router.push('/');
  }
};

const loadNode = async (node: any, resolve: (data: any[]) => void) => {
  if (node.level === 0) {
    return resolve([{ name: '全部文件', path: '' }]);
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

const handleNodeClick = (data: any) => {
  store.changeDirectory(data.path);
  if (router.currentRoute.value.path !== '/') {
    router.push('/');
  }
};

// 监听当前路径变化，同步高亮侧边栏节点
watch(() => store.currentPath, (newPath) => {
  if (treeRef.value) {
    treeRef.value.setCurrentKey(newPath);
  }
});

// 当存储桶改变时，如果 provider 就绪，选中根节点
watch(() => bucketsStore.activeBucketId, () => {
  treeKey.value++; // 切换桶时彻底刷新树
});

watch(() => store.provider, (newProvider) => {
  if (newProvider) {
    nextTick(() => {
      if (treeRef.value) {
        treeRef.value.setCurrentKey('');
      }
    });
  }
});
</script>

<style scoped>
:deep(.el-tree-node__content) {
  height: 40px;
  border-radius: 0;
  padding-left: 8px;
  padding-right: 24px;
  white-space: nowrap;
  margin-bottom: 2px;
  transition: all 0.2s ease;
}
:deep(.el-tree-node__content:hover) {
  background-color: #f3f4f6;
}
:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}
/* 允许树在水平方向撑开容器，实现横向滚动 */
:deep(.el-tree) {
  min-width: 100%;
  display: inline-block !important;
  padding-bottom: 20px;
}
</style>
