<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
      <div>
        <div class="flex justify-center">
          <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <el-icon :size="32" color="white"><Picture /></el-icon>
          </div>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          图片盒子 Image Box
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          欢迎回来，请登录您的账户
        </p>
      </div>
      
      <el-form :model="loginForm" class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input 
            v-model="loginForm.email" 
            placeholder="邮箱地址" 
            :prefix-icon="Message"
            size="large"
          />
        </el-form-item>
        <el-form-item>
          <el-input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="密码" 
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <div class="flex items-center justify-between">
          <el-checkbox v-model="rememberMe">记住我</el-checkbox>
          <div class="text-sm">
            <a href="#" class="font-medium text-blue-600 hover:text-blue-500">忘记密码？</a>
          </div>
        </div>

        <div>
          <el-button 
            type="primary" 
            class="w-full !h-12 !text-base !font-semibold" 
            :loading="loading"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </div>
        
        <div class="text-center mt-4">
          <span class="text-gray-500 text-sm">还没有账户？</span>
          <el-button link type="primary" @click="emit('toggle')">立即注册</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { supabase } from '../utils/supabase';
import { Picture, Message, Lock } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const loginForm = reactive({
  email: '',
  password: ''
});
const emit = defineEmits(['toggle']);
const loading = ref(false);
const rememberMe = ref(true);

const handleLogin = async () => {
  if (!loginForm.email || !loginForm.password) {
    ElMessage.warning('请输入完整信息');
    return;
  }

  loading.value = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });

    if (error) throw error;
    ElMessage.success('登录成功');
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
:deep(.el-input__wrapper) {
  border-radius: 8px;
}
</style>
