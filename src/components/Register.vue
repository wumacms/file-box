<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
      <div class="auth-container">
        <div>
          <div class="flex justify-center">
            <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <el-icon :size="32" color="white"><Picture /></el-icon>
            </div>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            创建账户
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            加入File Box，开启您的云端资源管理之旅
          </p>
        </div>
      
        <el-form :model="registerForm" :rules="rules" ref="registerFormRef" class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <el-form-item prop="email">
          <el-input 
            v-model="registerForm.email" 
            placeholder="邮箱地址" 
            :prefix-icon="Message"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="registerForm.password" 
            type="password" 
            placeholder="设置密码" 
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input 
            v-model="registerForm.confirmPassword" 
            type="password" 
            placeholder="确认密码" 
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <div>
          <el-button 
            type="primary" 
            class="w-full !h-12 !text-base !font-semibold" 
            :loading="loading"
            @click="handleRegister"
          >
            注 册
          </el-button>
        </div>
        
        <div class="text-center mt-4">
          <span class="text-gray-500 text-sm">已有账户？</span>
          <el-button link type="primary" @click="emit('toggle')">立即登录</el-button>
        </div>
      </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { supabase } from '../utils/supabase';
import { Picture, Message, Lock } from '@element-plus/icons-vue';
import { ElMessage, type FormInstance } from 'element-plus';

const emit = defineEmits(['toggle']);
const registerFormRef = ref<FormInstance>();
const loading = ref(false);

const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: ''
});

const validatePass2 = (_rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入密码不一致!'));
  } else {
    callback();
  }
};

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] }
  ],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { validator: validatePass2, trigger: 'blur' }
  ]
};

const handleRegister = async () => {
  if (!registerFormRef.value) return;
  
  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        const { error } = await supabase.auth.signUp({
          email: registerForm.email,
          password: registerForm.password,
          options: {
            emailRedirectTo: window.location.origin + window.location.pathname
          }
        });

        if (error) throw error;
        ElMessage.success('注册成功！请查收邮件以激活账户。');
        emit('toggle'); // 注册成功后切换回登录
      } catch (error: any) {
        ElMessage.error(error.message || '注册失败');
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style scoped>
.auth-container {
  width: 320px;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-button) {
  width: 100%;
}
</style>
