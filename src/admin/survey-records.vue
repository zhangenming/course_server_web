<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiJson } from '@/utils/request'

type Item = {
  id: number
  survey_id: number
  survey_title: string
  user_id: number
  user_name: string
  submitted_at: string
  total_score: number
  label: string
  answers: any
}

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<Item[]>([])
const total = ref<number>(0)

const load = async () => {
  loading.value = true
  error.value = null
  items.value = []
  total.value = 0
  try {
    const data = await apiJson('api/v1/records/surveys')
    total.value = Number((data as any)?.total || 0)
    items.value = Array.isArray((data as any)?.items) ? ((data as any).items as Item[]) : []
    if (!total.value) total.value = items.value.length
  } catch (e: any) {
    error.value = e?.message || '网络错误'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const fmt = (s: string) => {
  try {
    return new Date(s).toLocaleString()
  } catch {
    return s
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>问卷记录</h2>
      <el-button @click="load">刷新</el-button>
    </div>

    <div class="list-block">
      <div v-if="loading" class="status">正在获取列表…</div>
      <div v-if="error" class="error">{{ error }}</div>

      <div class="table" v-if="items.length">
        <div class="table-head">
          <span>ID</span>
          <span>问卷</span>
          <span>用户</span>
          <span>提交时间</span>
          <span>总分</span>
          <span>标签</span>
        </div>
        <div class="table-rows">
          <div class="row" v-for="it in items" :key="it.id">
            <span>{{ it.id }}</span>
            <span>{{ it.survey_title }} ({{ it.survey_id }})</span>
            <span>{{ it.user_name }} ({{ it.user_id }})</span>
            <span>{{ fmt(it.submitted_at) }}</span>
            <span>{{ it.total_score }}</span>
            <span>{{ it.label }}</span>
          </div>
        </div>
        <div class="table-foot">共 {{ total }} 条</div>
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
.table-head { display: grid; grid-template-columns: 72px 1.8fr 1.6fr 1.4fr 1fr 1fr; padding: 10px 16px; border-bottom: 1px solid #eef2f7; color: #6b7280; }
.table-rows .row { display: grid; grid-template-columns: 72px 1.8fr 1.6fr 1.4fr 1fr 1fr; padding: 12px 16px; align-items: center; border-bottom: 1px dashed #eef2f7; }
.table-foot { padding: 10px 16px; color: #6b7280; }
</style>

<script lang="ts">
export default {}
</script>