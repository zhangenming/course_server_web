<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { apiJson } from '@/utils/request'

type UserItem = { id: number; username: string; name: string | null; role: string }

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<UserItem[]>([])

const load = async () => {
  loading.value = true
  error.value = null
  items.value = []
  try {
    const params: any = {}
    if (role.value) params.role = role.value
    const data = await apiJson('api/v1/users/list', params)
    items.value = Array.isArray(data) ? (data as UserItem[]) : []
  } catch (e: any) {
    error.value = e?.message || '网络错误'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const search = ref('')
const role = ref('')
watch(role, () => {
  load()
})
const filtered = () => {
  let list = items.value
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter(x => String(x.username || '').toLowerCase().includes(q) || String(x.name || '').toLowerCase().includes(q))
  const r = role.value.trim().toLowerCase()
  if (r) list = list.filter(x => String(x.role || '').toLowerCase() === r)
  return list
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>用户管理</h2>
      <div class="tools">
        <input v-model="search" type="text" placeholder="搜索用户名/姓名" />
        <select v-model="role">
          <option value="">全部角色</option>
          <option value="teacher">教师</option>
          <option value="student">学员</option>
        </select>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <div class="list-block">
      <div v-if="loading" class="status">正在获取列表…</div>
      <div v-if="error" class="error">{{ error }}</div>

      <div class="table" v-if="filtered().length">
        <div class="table-head">
          <span>ID</span>
          <span>用户名</span>
          <span>姓名</span>
          <span>角色</span>
        </div>
        <div class="table-rows">
          <div class="row" v-for="it in filtered()" :key="it.id">
            <span>{{ it.id }}</span>
            <span>{{ it.username }}</span>
            <span>{{ it.name ?? '—' }}</span>
            <span>{{ it.role }}</span>
          </div>
        </div>
      </div>

      <div v-else-if="!loading && !error" class="empty">暂无用户数据</div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.tools { display: flex; gap: 8px; align-items: center; }
.tools input, .tools select { height: 32px; padding: 0 10px; border: 1px solid #e5e7eb; border-radius: 8px; }
.list-block { margin-top: 8px; }
.status { color: #6b7280; }
.error { color: #ef4444; }
.empty { color: #6b7280; }
.table { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
.table-head { display: grid; grid-template-columns: 80px 1.6fr 1.2fr 1fr; padding: 10px 16px; border-bottom: 1px solid #eef2f7; color: #6b7280; }
.table-rows .row { display: grid; grid-template-columns: 80px 1.6fr 1.2fr 1fr; padding: 12px 16px; align-items: center; border-bottom: 1px dashed #eef2f7; }
</style>

<script lang="ts">
export default {}
</script>