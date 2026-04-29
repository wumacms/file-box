<template>
  <div class="h-full bg-gray-50 p-6 overflow-y-auto">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center space-x-4">
          <el-button link @click="$router.push('/')" class="!p-0 hover:text-blue-600">
            <el-icon :size="20"><ArrowLeft /></el-icon>
          </el-button>
          <h1 class="text-2xl font-bold text-gray-900">系统设置</h1>
        </div>
        <el-button type="primary" @click="openDrawer()">添加存储桶</el-button>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-6 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-gray-800">存储桶管理</h2>
          <p class="text-sm text-gray-500 mt-1">配置您的阿里云 OSS 存储桶，支持添加多个存储桶并自由切换。</p>
        </div>

        <div class="p-6">
          <el-table :data="bucketsStore.buckets" style="width: 100%" v-loading="bucketsStore.loading">
            <el-table-column prop="name" label="名称" width="150" />
            <el-table-column prop="bucket" label="Bucket" width="180" />
            <el-table-column prop="region" label="地域" width="150" />
            <el-table-column label="默认" width="80">
              <template #default="scope">
                <el-tag v-if="scope.row.is_default" type="success" size="small">默认</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="200" align="right">
              <template #default="scope">
                <el-button 
                  v-if="!scope.row.is_default" 
                  size="small" 
                  @click="setDefault(scope.row)"
                >设为默认</el-button>
                <el-button size="small" @click="openDrawer(scope.row)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <div class="py-8 text-gray-400">
                暂无存储桶配置，请点击右上角添加。
              </div>
            </template>
          </el-table>
        </div>
      </div>
    </div>

    <!-- Edit Drawer -->
    <el-drawer
      v-model="drawerVisible"
      :title="editingId ? '编辑存储桶' : '添加存储桶'"
      size="500px"
      direction="rtl"
      :close-on-click-modal="false"
      class="custom-drawer"
    >
      <el-form :model="configForm" label-position="top">
        <el-form-item label="名称 (自定义别名)">
          <el-input v-model="configForm.name" placeholder="例如: 工作图床" />
        </el-form-item>
        <el-form-item label="OSS Region (地域)">
          <el-input v-model="configForm.region" placeholder="例如: oss-cn-beijing" />
        </el-form-item>
        <el-form-item label="OSS Bucket (存储桶名称)">
          <el-input v-model="configForm.bucket" />
        </el-form-item>
        <el-form-item label="AccessKey ID">
          <el-input v-model="configForm.access_key" />
        </el-form-item>
        <el-form-item label="AccessKey Secret">
          <el-input v-model="configForm.secret_key" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="configForm.is_default">设为默认存储桶</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end space-x-2">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useBucketsStore, type OssConfig } from '../stores/buckets';
import { useImageBoxStore } from '../stores/imageBox';
import { OSSProvider } from '../providers/OSSProvider';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';

const bucketsStore = useBucketsStore();
const imageBoxStore = useImageBoxStore();

const drawerVisible = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);

const configForm = reactive({
  name: '',
  region: '',
  bucket: '',
  access_key: '',
  secret_key: '',
  endpoint: null as string | null,
  is_default: false
});

const openDrawer = (bucket?: OssConfig) => {
  if (bucket) {
    editingId.value = bucket.id;
    configForm.name = bucket.name;
    configForm.region = bucket.region;
    configForm.bucket = bucket.bucket;
    configForm.access_key = bucket.access_key;
    configForm.secret_key = bucket.secret_key;
    configForm.is_default = bucket.is_default;
  } else {
    editingId.value = null;
    configForm.name = '';
    configForm.region = '';
    configForm.bucket = '';
    configForm.access_key = '';
    configForm.secret_key = '';
    configForm.is_default = bucketsStore.buckets.length === 0;
  }
  drawerVisible.value = true;
};

const handleSave = async () => {
  if (!configForm.name || !configForm.region || !configForm.bucket || !configForm.access_key || !configForm.secret_key) {
    ElMessage.warning('请填写完整的必填项');
    return;
  }

  saving.value = true;
  try {
    // Validate connection
    const testProvider = new OSSProvider({
      region: configForm.region,
      accessKeyId: configForm.access_key,
      accessKeySecret: configForm.secret_key,
      bucket: configForm.bucket,
      secure: true
    });
    
    await testProvider.checkConnection();

    // Save configuration
    if (editingId.value) {
      await bucketsStore.updateBucket(editingId.value, { ...configForm }, imageBoxStore.user.id);
      ElMessage.success('存储桶更新成功');
    } else {
      await bucketsStore.addBucket({ ...configForm }, imageBoxStore.user.id);
      ElMessage.success('存储桶添加成功');
    }
    
    drawerVisible.value = false;
  } catch (err: any) {
    console.error('Settings validation failed:', err);
    let msg = '保存失败：请检查配置项是否正确';
    if (err.name === 'NoSuchBucketError') msg = '验证失败：存储桶 (Bucket) 不存在';
    if (err.name === 'AccessDeniedError') msg = '验证失败：AccessKey 无效或权限不足';
    if (err.message?.includes('ENOTFOUND')) msg = '验证失败：无法连接到该 Region 节点';
    
    ElMessage({ message: msg, type: 'error', duration: 5000, showClose: true });
  } finally {
    saving.value = false;
  }
};

const setDefault = async (bucket: OssConfig) => {
  await bucketsStore.setDefaultBucket(bucket.id, imageBoxStore.user.id);
  ElMessage.success('已设为默认');
};

const handleDelete = (bucket: OssConfig) => {
  ElMessageBox.confirm(
    `确定要删除存储桶 "${bucket.name}" 的配置吗？（不影响 OSS 上的文件）`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    await bucketsStore.deleteBucket(bucket.id, imageBoxStore.user.id);
    ElMessage.success('删除成功');
  }).catch(() => {});
};
</script>
