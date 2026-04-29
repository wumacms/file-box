import { defineStore } from 'pinia';
import { supabase } from '../utils/supabase';

export interface OssConfig {
  id: string;
  user_id: string;
  name: string;
  bucket: string;
  region: string;
  access_key: string;
  secret_key: string;
  endpoint: string | null;
  is_default: boolean;
  created_at: string;
}

interface BucketsState {
  buckets: OssConfig[];
  activeBucketId: string | null;
  loading: boolean;
}

export const useBucketsStore = defineStore('buckets', {
  state: (): BucketsState => ({
    buckets: [],
    activeBucketId: null,
    loading: false,
  }),

  getters: {
    activeBucket: (state) => state.buckets.find((b) => b.id === state.activeBucketId),
  },

  actions: {
    async fetchBuckets(userId: string, force = false) {
      if (this.loading && !force) return;
      if (this.buckets.length > 0 && !force) return;
      
      this.loading = true;
      try {
        const { data, error } = await supabase
          .from('oss_configs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        this.buckets = data || [];

        // 不再自动设置活动存储桶，等待用户手动选择
      } catch (error) {
        console.error('Failed to fetch buckets:', error);
      } finally {
        this.loading = false;
      }
    },

    setActiveBucket(id: string) {
      this.activeBucketId = id;
    },

    async addBucket(config: Omit<OssConfig, 'id' | 'created_at' | 'user_id'>, userId: string) {
      this.loading = true;
      try {
        const isFirst = this.buckets.length === 0;
        const { data, error } = await supabase
          .from('oss_configs')
          .insert({
            user_id: userId,
            ...config,
            is_default: isFirst ? true : config.is_default,
          })
          .select()
          .single();

        if (error) throw error;
        this.buckets.push(data);
        if (data.is_default) {
          this.activeBucketId = data.id;
          // Update others to not default
          if (this.buckets.length > 1) {
             await this.setDefaultBucket(data.id, userId);
          }
        }
        return data;
      } catch (error) {
        console.error('Failed to add bucket:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateBucket(id: string, config: Partial<Omit<OssConfig, 'id' | 'created_at' | 'user_id'>>, userId: string) {
      this.loading = true;
      try {
        const { data, error } = await supabase
          .from('oss_configs')
          .update(config)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        const index = this.buckets.findIndex((b) => b.id === id);
        if (index > -1) {
          this.buckets[index] = data;
        }
        if (config.is_default) {
          await this.setDefaultBucket(id, userId);
        }
      } catch (error) {
        console.error('Failed to update bucket:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteBucket(id: string, userId: string) {
      this.loading = true;
      try {
        const { error } = await supabase
          .from('oss_configs')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;
        this.buckets = this.buckets.filter((b) => b.id !== id);
        if (this.activeBucketId === id) {
          this.activeBucketId = this.buckets.length > 0 ? this.buckets[0].id : null;
        }
      } catch (error) {
        console.error('Failed to delete bucket:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async setDefaultBucket(id: string, userId: string) {
      try {
        // Unset others
        await supabase
          .from('oss_configs')
          .update({ is_default: false })
          .eq('user_id', userId)
          .neq('id', id);
          
        await supabase
          .from('oss_configs')
          .update({ is_default: true })
          .eq('id', id)
          .eq('user_id', userId);

        this.buckets.forEach((b) => {
          b.is_default = b.id === id;
        });
      } catch (error) {
        console.error('Failed to set default bucket:', error);
      }
    },
    
    reset() {
      this.buckets = [];
      this.activeBucketId = null;
    }
  },
});
