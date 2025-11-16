<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiJson } from '@/utils/request'

type Item = { user_id: number; username: string; name: string | null; total_courses: number; learn_times: number; status: string }

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<Item[]>([])

const load = async () => {
  loading.value = true
  error.value = null
  items.value = []
  try {
    const data = await apiJson('api/v1/users/course_status')
    items.value = Array.isArray(data) ? (data as Item[]) : []
  } catch (e: any) {
    error.value = e?.message || '网络错误'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>学籍课程状态</h2>
      <el-button @click="load">刷新</el-button>
    </div>

    <div class="list-block">
      <div v-if="loading" class="status">正在获取列表…</div>
      <div v-if="error" class="error">{{ error }}</div>

      <div class="table" v-if="items.length">
        <div class="table-head">
          <span>用户ID</span>
          <span>用户名</span>
          <span>姓名</span>
          <span>总课程数</span>
          <span>学习次数</span>
          <span>状态</span>
        </div>
        <div class="table-rows">
          <div class="row" v-for="it in items" :key="it.user_id">
            <span>{{ it.user_id }}</span>
            <span>{{ it.username }}</span>
            <span>{{ it.name ?? '—' }}</span>
            <span>{{ it.total_courses }}</span>
            <span>{{ it.learn_times }}</span>
            <span>{{ it.status }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="!loading && !error" class="empty">暂无数据</div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.list-block { margin-top: 8px; }
.status { color: #6b7280; }
.error { color: #ef4444; }
.empty { color: #6b7280; }
.table { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
.table-head { display: grid; grid-template-columns: 100px 1.6fr 1.2fr 1fr 1fr 1fr; padding: 10px 16px; border-bottom: 1px solid #eef2f7; color: #6b7280; }
.table-rows .row { display: grid; grid-template-columns: 100px 1.6fr 1.2fr 1fr 1fr 1fr; padding: 12px 16px; align-items: center; border-bottom: 1px dashed #eef2f7; }
</style>

<script lang="ts">
export default {}
</script>