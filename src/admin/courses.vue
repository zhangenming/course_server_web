<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { apiJson } from '@/utils/request'

const listLoading = ref(false)
const listError = ref<string | null>(null)
const items = ref<any[]>([])

// Pagination
const currentPage = ref(1)
const pageSize = ref(8) // 8 cards per page for better visual layout
const totalCount = ref(0)

const loadList = async () => {
  listLoading.value = true
  listError.value = null
  items.value = []
  try {
    const data = await apiJson(`api/v1/courses/simple`)
    items.value = data.items
    totalCount.value = data.items.length // Set total count for pagination
  } catch (e: any) {
    listError.value = e?.message || '网络错误'
  } finally {
    listLoading.value = false
  }
}

const showCreate = ref(false)
const name = ref('')
const desc = ref('')
const selectedVideoIds = ref<number[]>([])
const allVideos = ref<any[]>([])
const videosLoading = ref(false)
const videosError = ref<string | null>(null)
const search = ref('')

const loadVideos = async () => {
  videosLoading.value = true
  videosError.value = null
  allVideos.value = []
  try {
    const data = await apiJson(`api/v1/videos/`)
    allVideos.value = data.items
  } catch (e: any) {
    videosError.value = e?.message || '网络错误'
  } finally {
    videosLoading.value = false
  }
}

const filteredVideos = () => {
  const q = search.value.trim().toLowerCase()
  if (!q) return allVideos.value
  return allVideos.value.filter((v: any) => String(v.name || '').toLowerCase().includes(q))
}

const openCreate = async () => {
  name.value = ''
  desc.value = ''
  selectedVideoIds.value = []
  showCreate.value = true
  await loadVideos()
  nextTick(() => {})
}
const closeCreate = () => {
  showCreate.value = false
}

const onDragStartVideo = (id: number) => {
  ;(window as any)._dragVideoId = id
}
const onDropVideo = () => {
  const id = (window as any)._dragVideoId
  if (!id && id !== 0) return
  if (!selectedVideoIds.value.includes(id)) selectedVideoIds.value.push(id)
}
const removeSelected = (id: number) => {
  selectedVideoIds.value = selectedVideoIds.value.filter(x => x !== id)
}

const canSubmit = () => {
  return !!name.value && selectedVideoIds.value.length > 0
}

const submitting = ref(false)
const submitError = ref<string | null>(null)

const submit = async () => {
  if (!canSubmit()) return
  submitting.value = true
  submitError.value = null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const body = JSON.stringify({ title: name.value, description: desc.value, video_ids: selectedVideoIds.value })
  try {
    await apiJson(`api/v1/courses/simple`, { method: 'POST', headers, body })
    showCreate.value = false
    await loadList()
  } catch (e: any) {
    submitError.value = e?.message || '网络错误'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadList()
})

// Pagination functions
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
  const delta = 1 // Number of pages to show on each side of current page
  
  if (total <= 5) {
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
    end = Math.min(total - 1, 3)
  }
  
  // Adjust if we're near the end
  if (current >= total - delta) {
    start = Math.max(2, total - 2)
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

// Computed property for paginated items
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return items.value.slice(start, end)
})

const deleteLoading = ref<number | null>(null)
const deleteError = ref<string | null>(null)
const deleteCourse = async (it: any) => {
  if (!it?.id) return
  try {
    await ElMessageBox.confirm('确定删除该课程？', '提示', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch {
    return
  }
  deleteLoading.value = it.id
  deleteError.value = null
  try {
    await apiJson(`api/v1/courses/${it.id}`, { method: 'DELETE' })
    await loadList()
  } catch (e: any) {
    deleteError.value = e?.message || '删除失败'
  } finally {
    deleteLoading.value = null
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>课程管理</h2>
      <el-button type="primary" @click="openCreate">新建课程</el-button>
    </div>

    <div class="list-block">
      <div v-if="listLoading" class="status">正在获取列表…</div>
      <div v-if="listError" class="error">{{ listError }}</div>
      
      <div v-if="items.length" class="content-wrapper">
        <div class="cards">
          <div class="card" v-for="it in paginatedItems" :key="it.id">
            <div class="card-body">
              <div class="card-title">{{ it.title || '未命名课程' }}</div>
              <div class="card-desc">{{ it.description || '暂无描述' }}</div>
              <div class="card-meta">视频数：{{ Array.isArray(it.video_ids) ? it.video_ids.length : (it.videos?.length || 0) }}</div>
            </div>
            <div class="card-actions">
              <el-button type="danger" :disabled="deleteLoading === it.id" @click="deleteCourse(it)">删除</el-button>
            </div>
          </div>
        </div>
        
        <!-- Pagination -->
        <div class="pagination" v-if="totalCount > pageSize">
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
        <div v-else-if="totalCount > 0 && totalCount <= pageSize" class="pagination-info-single">
          共 {{ totalCount }} 条记录
        </div>
      </div>
      
      <div v-else-if="!listLoading && !listError" class="empty">暂无课程数据</div>
      <div v-if="deleteError" class="error">{{ deleteError }}</div>
    </div>

    <div v-if="showCreate" class="modal-overlay">
      <div class="create-modal">
        <div class="create-header">
          <h3 class="create-title">新建课程</h3>
        </div>
        <div class="create-content">
          <div class="create-form">
            <div class="form-row">
              <label class="form-label">名称</label>
              <div class="form-control">
                <input type="text" v-model="name" maxlength="100" placeholder="请输入课程名称" />
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">描述</label>
              <div class="form-control">
                <textarea v-model="desc" maxlength="200" placeholder="请输入课程描述"></textarea>
              </div>
            </div>

            <div class="dnd-grid">
              <div class="videos-panel">
                <div class="panel-title">视频库</div>
                <div class="panel-tools">
                  <input type="text" v-model="search" placeholder="搜索视频" />
                </div>
                <div class="panel-list">
                  <div
                    class="video-item"
                    v-for="v in filteredVideos()"
                    :key="v.id"
                    draggable="true"
                    @dragstart="onDragStartVideo(v.id)"
                  >
                    <div class="vi-cover">
                      <img v-if="v.cover_url || v.cover" :src="v.cover_url || v.cover" alt="封面" />
                      <div v-else class="cover-placeholder">无封面</div>
                    </div>
                    <div class="vi-title">{{ v.name || '未命名视频' }}</div>
                    <el-button @click="!selectedVideoIds.includes(v.id) && selectedVideoIds.push(v.id)">添加</el-button>
                  </div>
                </div>
              </div>

              <div class="selected-panel" @dragover.prevent @drop="onDropVideo">
                <div class="panel-title">已选择视频（{{ selectedVideoIds.length }}）</div>
                <div class="panel-list">
                  <div class="selected-item" v-for="sid in selectedVideoIds" :key="sid">
                    <div class="vi-cover">
                      <img
                        v-if="(allVideos.find(x => x.id === sid) || {}).cover_url || (allVideos.find(x => x.id === sid) || {}).cover"
                        :src="(allVideos.find(x => x.id === sid) || {}).cover_url || (allVideos.find(x => x.id === sid) || {}).cover"
                        alt="封面"
                      />
                      <div v-else class="cover-placeholder">无封面</div>
                    </div>
                    <div class="vi-title">{{ (allVideos.find(x => x.id === sid) || {}).name || '视频 ' + sid }}</div>
                    <el-button @click="removeSelected(sid)">移除</el-button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="submitError" class="error">{{ submitError }}</div>
          </div>
        </div>
        <div class="create-footer">
          <el-button @click="closeCreate">取消</el-button>
          <el-button type="primary" :disabled="!canSubmit() || submitting" @click="submit">创建</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { 
  max-width: none; 
  width: 100%; 
  margin: 0; 
  padding: 24px; 
  background: #f8fafc; 
  min-height: 100vh; 
}
.toolbar { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 24px; 
  background: #fff; 
  padding: 20px 24px; 
  border-radius: 12px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
}
.toolbar h2 { 
  margin: 0; 
  color: #1f2937; 
  font-size: 24px; 
  font-weight: 700; 
}
.list-block { 
  margin-top: 0; 
  background: #fff; 
  border-radius: 12px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
  overflow: hidden; 
}
.cards { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
  gap: 16px; 
  padding: 24px; 
}
.card { 
  background: #fff; 
  border: 1px solid #e5e7eb; 
  border-radius: 12px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
  transition: all 0.2s ease; 
  overflow: hidden; 
}
.card:hover { 
  box-shadow: 0 4px 16px rgba(0,0,0,0.1); 
  transform: translateY(-2px); 
}
.card-body { 
  padding: 20px; 
}
.card-title { 
  font-weight: 700; 
  color: #111827; 
  font-size: 16px; 
  margin-bottom: 8px; 
}
.card-meta { 
  margin-top: 8px; 
  font-size: 13px; 
  color: #6b7280; 
  background: #f3f4f6; 
  padding: 6px 10px; 
  border-radius: 6px; 
  display: inline-block; 
}
.card-desc { 
  margin-top: 12px; 
  color: #374151; 
  font-size: 14px; 
  line-height: 1.5; 
  display: -webkit-box; 
  -webkit-line-clamp: 2; 
  -webkit-box-orient: vertical; 
  overflow: hidden; 
}
.card-actions { 
  padding: 16px 20px; 
  border-top: 1px solid #e5e7eb; 
  display: flex; 
  justify-content: flex-end; 
  background: #f9fafb; 
}
.status { 
  padding: 24px; 
  text-align: center; 
  color: #6b7280; 
  font-size: 14px; 
}
.error { 
  padding: 24px; 
  text-align: center; 
  color: #ef4444; 
  background: #fef2f2; 
  border-left: 4px solid #ef4444; 
}

.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000; }
.create-modal { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 20px; max-width: 1000px; width: 100%; }
.create-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.create-title { color: #2563eb; font-weight: 700; font-size: 20px; }
.create-content { display: block; }
.create-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px; }

.form-row { display: grid; grid-template-columns: 72px 1fr; gap: 12px; align-items: start; margin-bottom: 12px; }
.form-label { color: #374151; padding-top: 6px; }
.form-control input[type='text'], .form-control textarea { width: 100%; padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 8px; }
.form-control textarea { min-height: 80px; }

.dnd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
.panel-title { font-weight: 600; margin-bottom: 8px; }
.panel-tools { display: flex; gap: 8px; margin-bottom: 8px; }
.panel-tools input { flex: 1; padding: 8px 10px; border: 1px solid #e5e7eb; border-radius: 8px; }
.panel-list { display: grid; grid-template-columns: 1fr; gap: 8px; max-height: 360px; overflow: auto; padding-right: 6px; }
.video-item, .selected-item { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 10px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.vi-cover { width: 56px; height: 56px; border-radius: 8px; overflow: hidden; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
.vi-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover-placeholder { font-size: 12px; color: #9ca3af; }
.vi-title { font-weight: 600; color: #111827; }
.vi-meta { font-size: 12px; color: #6b7280; }
.selected-panel { border: 2px dashed #cbd5e1; border-radius: 12px; padding: 12px; }

/* Pagination Styles */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.pagination-info {
  color: #6b7280;
  font-size: 14px;
}

.pagination-info-single {
  padding: 16px 24px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  min-width: 36px;
  text-align: center;
}

.page-btn:hover:not(:disabled):not(.ellipsis) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.page-btn.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.page-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.ellipsis {
  cursor: default;
  border: none;
  background: transparent;
  padding: 8px 4px;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

/* Empty state */
.empty {
  padding: 48px 24px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}

/* Responsive design */
@media (max-width: 768px) {
  .page {
    padding: 16px;
  }
  
  .toolbar {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .toolbar h2 {
    font-size: 20px;
  }
  
  .cards {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 12px;
  }
  
  .pagination {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .pagination-buttons {
    justify-content: center;
  }
  
  .dnd-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .create-modal {
    margin: 16px;
    padding: 16px;
  }
}

</style>

<script lang="ts">
export default {}
</script>
