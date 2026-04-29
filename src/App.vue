<template>
  <div v-if="!session" class="h-screen w-screen flex items-center justify-center bg-gray-50">
    <Login v-if="!showRegister" @switch-to-register="showRegister = true" />
    <Register v-else @switch-to-login="showRegister = false" />
  </div>

  <div v-else class="h-screen w-screen flex bg-white overflow-hidden font-sans antialiased text-gray-900 relative">
    
    <!-- Mobile overlay -->
    <div 
      v-if="showMobileSidebar" 
      class="fixed inset-0 bg-gray-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity" 
      @click="showMobileSidebar = false"
    ></div>

    <!-- Sidebar Component -->
    <Sidebar 
      :is-mobile="isMobile" 
      :show-mobile="showMobileSidebar"
      @logout="handleLogout"
    />

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
      <router-view @toggle-sidebar="showMobileSidebar = true" />
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { supabase } from './utils/supabase';
import { useImageBoxStore } from './stores/imageBox';
import { useBucketsStore } from './stores/buckets';
import { OSSProvider } from './providers/OSSProvider';
import Login from './components/Login.vue';
import Register from './components/Register.vue';
import Sidebar from './components/Sidebar.vue';
import { useRouter } from 'vue-router';

const store = useImageBoxStore();
const bucketsStore = useBucketsStore();
const router = useRouter();

const session = ref<any>(null);
const showRegister = ref(false);

const showMobileSidebar = ref(false);
const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
  if (!isMobile.value) {
    showMobileSidebar.value = false;
  }
};

// Close mobile sidebar on navigation
watch(() => store.currentPath, () => {
  if (isMobile.value) {
    showMobileSidebar.value = false;
  }
});

watch(() => router.currentRoute.value.path, () => {
  if (isMobile.value) {
    showMobileSidebar.value = false;
  }
});

let isInitializing = false;
const initApp = async (user: any) => {
  if (isInitializing) return;
  isInitializing = true;
  try {
    store.setUser(user);
    // 直接获取存储桶列表
    await bucketsStore.fetchBuckets(user.id);

    // 恢复上次选择的存储桶
    const savedId = localStorage.getItem(`image_box_active_bucket_${user.id}`);
    if (savedId && bucketsStore.buckets.some(b => b.id === savedId)) {
      bucketsStore.activeBucketId = savedId;
    }
  } finally {
    isInitializing = false;
  }
};

// Watch active bucket changes to re-instantiate provider
let lastBucketId = '';
watch(() => bucketsStore.activeBucketId, async (newId) => {
  if (newId === lastBucketId) return;
  lastBucketId = newId || '';
  
  // 持久化选择
  if (store.user && newId) {
    localStorage.setItem(`image_box_active_bucket_${store.user.id}`, newId);
  }
  
  const activeBucket = bucketsStore.activeBucket;
  if (activeBucket) {
    try {
      const provider = new OSSProvider({
        region: activeBucket.region,
        accessKeyId: activeBucket.access_key,
        accessKeySecret: activeBucket.secret_key,
        bucket: activeBucket.bucket,
        secure: true,
      });
      store.setProvider(provider);
      // Reset path to root when switching buckets
      await store.changeDirectory('');
    } catch (err) {
      console.error('OSS init failed:', err);
      store.setProvider(null as any);
    }
  } else {
    store.setProvider(null as any);
  }
});

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);

  supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
    session.value = initialSession;
    if (initialSession?.user) {
      initApp(initialSession.user);
    }
  });

  supabase.auth.onAuthStateChange((event, newSession) => {
    session.value = newSession;
    if (newSession?.user) {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        initApp(newSession.user);
      }
    } else {
      store.setUser(null);
      bucketsStore.reset();
      store.setProvider(null as any);
      lastBucketId = ''; // Reset to allow re-selection of the same bucket after login
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

const handleLogout = async () => {
  await supabase.auth.signOut();
  session.value = null;
  store.setUser(null);
  bucketsStore.reset();
  lastBucketId = '';
  router.push('/');
};
</script>
