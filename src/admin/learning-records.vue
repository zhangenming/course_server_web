<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { apiJson } from '@/utils/request'

type Item = {
  id: number
  user_id: number
  user_name: string
  course_id: number
  course_title: string
  start_time: string
  end_time: string
  progress_status: string
  learning_time_minutes: number
}

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<Item[]>([])
const total = ref<number>(0)

// Pagination state
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [5, 10, 15, 20, 50]

// Computed properties for pagination
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return items.value.slice(start, end)
})

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

const load = async () => {
  loading.value = true
  error.value = null
  items.value = []
  total.value = 0
  try {
    const data = await apiJson('api/v1/records/learning')
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

// Pagination functions
const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const changePageSize = (size: number) => {
  pageSize.value = size
  currentPage.value = 1 // Reset to first page when changing page size
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>学习记录</h2>
      <div class="toolbar-actions">
        <div class="page-size-selector">
          <span class="page-size-label">每页显示：</span>
          <select v-model="pageSize" @change="changePageSize(pageSize)" class="page-size-select">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
        </div>
        <el-button @click="load" type="primary" :loading="loading">刷新</el-button>
      </div>
    </div>

    <div class="list-block">
      <div v-if="loading" class="status">正在获取列表…</div>
      <div v-if="error" class="error">{{ error }}</div>

      <div class="table" v-if="items.length">
        <div class="table-head">
          <span data-label="ID">ID</span>
          <span data-label="用户">用户</span>
          <span data-label="课程">课程</span>
          <span data-label="开始时间">开始时间</span>
          <span data-label="结束时间">结束时间</span>
          <span data-label="状态">状态</span>
          <span data-label="时长">时长(分钟)</span>
        </div>
        <div class="table-rows">
          <div class="row" v-for="it in paginatedItems" :key="it.id">
            <span data-label="ID">{{ it.id }}</span>
            <span data-label="用户">{{ it.user_name }} ({{ it.user_id }})</span>
            <span data-label="课程">{{ it.course_title }} ({{ it.course_id }})</span>
            <span data-label="开始时间">{{ fmt(it.start_time) }}</span>
            <span data-label="结束时间">{{ fmt(it.end_time) }}</span>
            <span data-label="状态">
              <span class="status-badge" :class="it.progress_status.toLowerCase()">
                {{ it.progress_status }}
              </span>
            </span>
            <span data-label="时长">{{ it.learning_time_minutes }}</span>
          </div>
        </div>
        <div class="table-foot">
          <div class="pagination-info">
            显示 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, total) }} 条，共 {{ total }} 条
          </div>
        </div>
      </div>

      <div v-else-if="!loading && !error" class="empty">暂无数据</div>
    </div>

    <!-- Pagination Controls -->
    <div class="pagination" v-if="totalPages > 1">
      <div class="pagination-controls">
        <button 
          class="pagination-btn" 
          @click="prevPage" 
          :disabled="currentPage === 1"
          :class="{ disabled: currentPage === 1 }"
        >
          上一页
        </button>
        
        <div class="pagination-pages">
          <button 
            v-if="visiblePages && visiblePages.length > 0 && visiblePages[0]! > 1" 
            class="pagination-btn" 
            @click="changePage(1)"
          >
            1
          </button>
          <span v-if="visiblePages && visiblePages.length > 0 && visiblePages[0]! > 2" class="pagination-ellipsis">...</span>
          
          <button 
            v-for="page in visiblePages" 
            :key="page" 
            class="pagination-btn" 
            @click="changePage(page)"
            :class="{ active: page === currentPage }"
          >
            {{ page }}
          </button>
          
          <span v-if="visiblePages && visiblePages.length > 0 && visiblePages[visiblePages.length - 1]! < totalPages - 1" class="pagination-ellipsis">...</span>
          <button 
            v-if="visiblePages && visiblePages.length > 0 && visiblePages[visiblePages.length - 1]! < totalPages" 
            class="pagination-btn" 
            @click="changePage(totalPages)"
          >
            {{ totalPages }}
          </button>
        </div>
        
        <button 
          class="pagination-btn" 
          @click="nextPage" 
          :disabled="currentPage === totalPages"
          :class="{ disabled: currentPage === totalPages }"
        >
          下一页
        </button>
      </div>
      
      <div class="pagination-summary">
        第 {{ currentPage }} / {{ totalPages }} 页
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { 
  padding: 0; 
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
  min-height: 100vh; 
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.toolbar { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 24px; 
  padding: 24px 0; 
  border-bottom: 1px solid #e2e8f0; 
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar h2 { 
  font-size: 32px; 
  font-weight: 700; 
  color: #0f172a; 
  margin: 0; 
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-size-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.page-size-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-size-select:hover {
  border-color: #3b82f6;
}

.page-size-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.list-block { 
  margin-top: 24px; 
  padding: 0 8px;
}

.status { 
  color: #64748b; 
  font-weight: 500; 
  text-align: center;
  padding: 40px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.error { 
  color: #ef4444; 
  font-weight: 500; 
  text-align: center;
  padding: 40px;
  font-size: 16px;
  background: rgba(254, 242, 242, 0.8);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid #fecaca;
}

.empty { 
  color: #64748b; 
  font-weight: 500; 
  text-align: center; 
  padding: 60px; 
  font-size: 18px; 
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  border: 2px dashed #e2e8f0;
}

.table { 
  background: #fff; 
  border: 1px solid #e2e8f0; 
  border-radius: 20px; 
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08); 
  overflow: hidden;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.table:hover {
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
}

.table-head { 
  display: grid; 
  grid-template-columns: 80px 1.8fr 1.6fr 1.6fr 1.6fr 1fr 1fr; 
  padding: 20px 24px; 
  border-bottom: 1px solid #f1f5f9; 
  color: #374151; 
  font-weight: 600; 
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  font-size: 14px;
  letter-spacing: 0.025em;
}

.table-rows .row { 
  display: grid; 
  grid-template-columns: 80px 1.8fr 1.6fr 1.6fr 1.6fr 1fr 1fr; 
  padding: 20px 24px; 
  align-items: center; 
  border-bottom: 1px solid #f8fafc; 
  transition: all 0.2s ease; 
  background: white;
}

.table-rows .row:hover { 
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.table-foot { 
  padding: 20px 24px; 
  color: #64748b; 
  font-weight: 500; 
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-info {
  font-size: 14px;
  color: #64748b;
}

/* Status Badge Styles */
.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-block;
  text-align: center;
  min-width: 80px;
}

.status-badge.completed {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
  border: 1px solid #4ade80;
}

.status-badge.in-progress {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid #f59e0b;
}

.status-badge.not-started {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
  border: 1px solid #ef4444;
}

.status-badge.default {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  color: #475569;
  border: 1px solid #94a3b8;
}

/* Enhanced Pagination Styles */
.pagination {
  margin-top: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-pages {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-btn {
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 44px;
  text-align: center;
}

.pagination-btn:hover:not(.disabled) {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.pagination-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: #2563eb;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.pagination-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.pagination-ellipsis {
  color: #9ca3af;
  font-weight: 600;
  padding: 0 4px;
}

.pagination-summary {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .toolbar-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .table-head,
  .table-rows .row {
    grid-template-columns: 60px 1fr 1fr;
  }
  
  .table-head span:nth-child(4),
  .table-head span:nth-child(5),
  .table-head span:nth-child(6),
  .table-head span:nth-child(7),
  .table-rows .row span:nth-child(4),
  .table-rows .row span:nth-child(5),
  .table-rows .row span:nth-child(6),
  .table-rows .row span:nth-child(7) {
    display: none;
  }
  
  .pagination {
    flex-direction: column;
    gap: 16px;
  }
  
  .pagination-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .table-head,
  .table-rows .row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .table-head span,
  .table-rows .row span {
    display: block;
    position: relative;
    padding-left: 100px;
  }
  
  .table-head span::before,
  .table-rows .row span::before {
    content: attr(data-label);
    position: absolute;
    left: 0;
    font-weight: 600;
    color: #374151;
  }
  
  .table-head {
    display: none;
  }
  
  .table-rows .row {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    margin-bottom: 16px;
    padding: 20px;
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  .table-foot {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .pagination-btn {
    padding: 8px 12px;
    font-size: 13px;
    min-width: 36px;
  }
}

</style>

<script lang="ts">
export default {}
</script>