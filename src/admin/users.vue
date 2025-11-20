<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { apiJson } from '@/utils/request'

type UserItem = { id: number; username: string; name: string | null; role: string }

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<UserItem[]>([])

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const totalCount = ref(0)

const load = async () => {
  loading.value = true
  error.value = null
  items.value = []
  try {
    const params: any = {}
    if (role.value) params.role = role.value
    const data = await apiJson('api/v1/users/list', params)
    items.value = Array.isArray(data?.items) ? (data.items as UserItem[]) : []
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
  currentPage.value = 1 // Reset to first page when role changes
  load()
})
watch(search, () => {
  currentPage.value = 1 // Reset to first page when search changes
})

const filtered = () => {
  let list = items.value
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter(x => String(x.username || '').toLowerCase().includes(q) || String(x.name || '').toLowerCase().includes(q))
  const r = role.value.trim().toLowerCase()
  if (r) list = list.filter(x => String(x.role || '').toLowerCase() === r)
  
  // Update total count
  totalCount.value = list.length
  
  // Apply pagination
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return list.slice(start, end)
}

const totalPages = () => {
  return Math.ceil(totalCount.value / pageSize.value)
}

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages()) {
    currentPage.value = page
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages()) {
    currentPage.value++
  }
}

// Computed property for visible page numbers
const visiblePages = computed(() => {
  const total = totalPages()
  const current = currentPage.value
  const delta = 2 // Number of pages to show on each side of current page
  
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  
  const pages: (number | string)[] = []
  
  // Always show first page
  pages.push(1)
  
  // Calculate start and end of visible range
  let start = Math.max(2, current - delta)
  let end = Math.min(total - 1, current + delta)
  
  // Adjust if we're near the beginning
  if (current <= delta + 1) {
    end = Math.min(total - 1, 5)
  }
  
  // Adjust if we're near the end
  if (current >= total - delta) {
    start = Math.max(2, total - 4)
  }
  
  // Add ellipsis after first page if needed
  if (start > 2) {
    pages.push('...')
  }
  
  // Add middle pages
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  // Add ellipsis before last page if needed
  if (end < total - 1) {
    pages.push('...')
  }
  
  // Always show last page
  if (total > 1) {
    pages.push(total)
  }
  
  return pages
})
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div class="toolbar-header">
        <h2>用户管理</h2>
        <p class="toolbar-subtitle">管理系统中的所有用户账户</p>
      </div>
      <div class="tools">
        <div class="search-group">
          <input v-model="search" type="text" placeholder="搜索用户名/姓名" class="search-input" />
          <span class="search-icon">🔍</span>
        </div>
        <select v-model="role" class="role-select">
          <option value="">全部角色</option>
          <option value="teacher">教师</option>
          <option value="student">学员</option>
        </select>
        <el-button @click="load" type="primary" class="refresh-btn">
          <span class="refresh-icon">🔄</span>
          刷新
        </el-button>
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
            <span class="username-cell">{{ it.username }}</span>
            <span class="name-cell">{{ it.name ?? '—' }}</span>
            <span><span class="role-badge" :class="'role-' + it.role">{{ it.role }}</span></span>
          </div>
        </div>
      </div>

      <div v-else-if="!loading && !error" class="empty">暂无用户数据</div>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="totalCount > 0">
      <div class="pagination-info">
        显示 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, totalCount) }} 条，共 {{ totalCount }} 条
      </div>
      <div class="pagination-buttons">
        <button 
          class="page-btn" 
          @click="prevPage" 
          :disabled="currentPage === 1"
          :class="{ disabled: currentPage === 1 }"
        >
          上一页
        </button>
        
        <div class="page-numbers">
          <button 
            v-for="page in visiblePages" 
            :key="page"
            class="page-btn"
            :class="{ active: page === currentPage, ellipsis: page === '...' }"
            @click="page !== '...' && changePage(page as number)"
            :disabled="page === '...'"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          class="page-btn" 
          @click="nextPage" 
          :disabled="currentPage === totalPages()"
          :class="{ disabled: currentPage === totalPages() }"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 24px; background: #f8fafc; min-height: 100vh; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; background: #fff; padding: 20px 24px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #e5e7eb; }
.toolbar-header { display: flex; flex-direction: column; gap: 4px; }
.toolbar h2 { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0; }
.toolbar-subtitle { font-size: 13px; color: #64748b; margin: 0; }
.tools { display: flex; gap: 12px; align-items: center; }
.search-group { position: relative; display: flex; align-items: center; }
.search-input { height: 40px; padding: 0 16px 0 40px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; transition: border-color 0.2s ease, box-shadow 0.2s ease; min-width: 200px; }
.search-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); outline: none; }
.search-icon { position: absolute; left: 12px; color: #64748b; font-size: 14px; pointer-events: none; }
.role-select { height: 40px; padding: 0 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; background: #fff; transition: border-color 0.2s ease; min-width: 120px; cursor: pointer; }
.role-select:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); outline: none; }
.refresh-btn { display: flex; align-items: center; gap: 6px; }
.refresh-icon { font-size: 14px; }
.list-block { margin-top: 0; }
.status { color: #64748b; font-size: 14px; padding: 16px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px; margin: 16px 0; }
.error { color: #dc2626; font-size: 14px; padding: 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; margin: 16px 0; }
.empty { color: #64748b; font-size: 14px; padding: 24px; text-align: center; background: #fafbfc; border-radius: 12px; border: 1px dashed #e2e8f0; }
.table { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden; transition: box-shadow 0.2s ease; }
.table:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.table-head { display: grid; grid-template-columns: 80px 1.6fr 1.2fr 1fr; padding: 16px 24px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 500; font-size: 14px; background: #fafbfc; }
.table-rows { padding: 0 24px; }
.table-rows .row { display: grid; grid-template-columns: 80px 1.6fr 1.2fr 1fr; padding: 16px 0; align-items: center; border-bottom: 1px solid #f8fafc; transition: background-color 0.2s ease; }
.table-rows .row:hover { background-color: #f8fafc; }
.table-rows .row:last-child { border-bottom: none; }
.table-rows .row span { font-size: 14px; color: #374151; }
.table-rows .row span:first-child { color: #64748b; font-weight: 500; }

/* Role badges */
.role-badge { padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; display: inline-block; text-transform: capitalize; }
.role-admin { background: #fef3c7; color: #92400e; }
.role-teacher { background: #dcfce7; color: #166534; }
.role-student { background: #e0e7ff; color: #4338ca; }
.role-user { background: #f3e8ff; color: #7c3aed; }

/* Enhanced table cells */
.username-cell { font-weight: 500; color: #1e293b; }
.name-cell { color: #64748b; }
.table-rows .row:hover .username-cell { color: #8b5cf6; }
.table-rows .row:hover .name-cell { color: #374151; }

/* Enhanced button styling */
:deep(.el-button) { transition: all 0.2s ease; font-weight: 500; }
:deep(.el-button:hover) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
:deep(.el-button:active) { transform: translateY(0); }

/* Pagination */
.pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding: 16px 24px; background: #fff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #e5e7eb; }
.pagination-info { color: #64748b; font-size: 14px; font-weight: 500; }
.pagination-buttons { display: flex; align-items: center; gap: 8px; }
.page-btn { min-width: 36px; height: 36px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #374151; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
.page-btn:hover:not(.disabled):not(.ellipsis) { border-color: #8b5cf6; color: #8b5cf6; background: #f8fafc; }
.page-btn.active { background: #8b5cf6; color: #fff; border-color: #8b5cf6; }
.page-btn.disabled { opacity: 0.5; cursor: not-allowed; background: #f8fafc; }
.page-btn.ellipsis { cursor: default; background: transparent; border-color: transparent; color: #64748b; }
.page-numbers { display: flex; gap: 4px; }

/* Responsive design */
@media (max-width: 768px) {
  .page { padding: 16px; }
  .toolbar { flex-direction: column; gap: 16px; align-items: stretch; }
  .tools { flex-wrap: wrap; justify-content: center; }
  .tools input, .tools select { min-width: auto; flex: 1; }
  .table-head { grid-template-columns: 60px 1fr 1fr; padding: 12px 16px; }
  .table-rows .row { grid-template-columns: 60px 1fr 1fr; padding: 12px 16px; }
  .table-head span:last-child, .table-rows .row span:last-child { display: none; }
  .pagination { flex-direction: column; gap: 12px; align-items: stretch; }
  .pagination-buttons { justify-content: center; }
}

@media (max-width: 480px) {
  .page { padding: 12px; }
  .toolbar { padding: 16px; }
  .toolbar h2 { font-size: 16px; }
  .tools { flex-direction: column; width: 100%; }
  .tools input, .tools select { width: 100%; }
  .table-head { grid-template-columns: 1fr 1fr; padding: 10px 12px; font-size: 13px; }
  .table-rows .row { grid-template-columns: 1fr 1fr; padding: 10px 12px; }
  .table-head span:first-child, .table-rows .row span:first-child { display: none; }
  .pagination { padding: 12px; }
  .pagination-info { font-size: 13px; text-align: center; }
  .page-btn { min-width: 32px; height: 32px; font-size: 13px; padding: 0 8px; }
}
</style>

<script lang="ts">
export default {}
</script>