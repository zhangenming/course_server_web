<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { apiJson } from '@/utils/request'
import { bytesToSize } from '@/utils'

const name = ref('')
const file = ref<File | null>(null)
const uploading = ref(false)
const result = ref<{ id?: number; music_url?: string; message?: string } | null>(null)
const error = ref<string | null>(null)

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  file.value = input.files && input.files[0] ? input.files[0] : null
  if (file.value) 
  {
    const isAudio = file.value.type.startsWith('audio/')
    const maxSize = 100 * 1024 * 1024
    if (!isAudio) {
      error.value = '文件类型不支持，请选择音频文件'
      file.value = null
    } else if (file.value.size > maxSize) {
      error.value = '文件过大，建议 ≤ 100MB'
      file.value = null
    } else {
      error.value = null
    }
  }
}

const canSubmit = () => {
  return !!name.value && !!file.value && !uploading.value
}

const showCreate = ref(false)

const submit = async () => {
  if (!canSubmit()) return
  uploading.value = true
  error.value = null
  result.value = null
  const fd = new FormData()
  fd.append('name', name.value)
  fd.append('music', file.value as File)
  try {
    const data = await apiJson(`api/v1/music/upload`, {
      method: 'POST',
      body: fd,
    })
    result.value = data
    showCreate.value = false
    await loadList()
  } catch (e: any) {
    error.value = e?.message || '网络错误'
  } finally {
    uploading.value = false
  }
}

const nameInputRef = ref<HTMLInputElement | null>(null)

const openCreate = () => {
  name.value = ''
  file.value = null
  error.value = null
  result.value = null
  showCreate.value = true
  nextTick(() => {
    nameInputRef.value?.focus()
  })
}
const closeCreate = () => {
  showCreate.value = false
}

const listLoading = ref(false)
const listError = ref<string | null>(null)
const items = ref<any[]>([])
const playingItem = ref<any | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)

// Pagination
const currentPage = ref(1)
const pageSize = ref(12) // 12 music items per page
const totalCount = ref(0)

const loadList = async () => {
  listLoading.value = true
  listError.value = null
  items.value = []
  try {
    const data = await apiJson(`api/v1/music/`)
    items.value = data?.items || []
    totalCount.value = items.value.length // Set total count for pagination
  } catch (e: any) {
    listError.value = e?.message || '网络错误'
  } finally {
    listLoading.value = false
  }
}

const deleteLoading = ref<number | null>(null)
const deleteError = ref<string | null>(null)

const deleteItem = async (it: any) => {
  if (!it?.id) return
  try {
    await ElMessageBox.confirm('确定删除该音乐？', '提示', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch {
    return
  }
  deleteLoading.value = it.id
  deleteError.value = null
  try {
    const data = await apiJson(`api/v1/music/${it.id}`, {
      method: 'DELETE',
    })
    await loadList()
  } catch (e: any) {
    deleteError.value = e?.message || '网络错误'
  } finally {
    deleteLoading.value = null
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

const openAudio = async (it: any) => {
  if (!it?.url) return
  playingItem.value = it
  nextTick(() => {
    audioRef.value?.load()
    audioRef.value?.play().catch(() => {})
  })
}
const closePlaying = () => {
  playingItem.value = null
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>音乐管理</h2>
      <el-button type="primary" @click="openCreate" size="large">
          <svg viewBox="0 0 24 24" width="20" height="20" style="margin-right: 6px;">
            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor"/>
          </svg>
          新增音乐
        </el-button>
    </div>

    <div class="list-block">
      <div v-if="listLoading" class="status">正在获取音乐列表…</div>
      <div v-if="listError" class="error">{{ listError }}</div>
      <div v-if="paginatedItems.length" class="cards">
        <div class="card" v-for="it in paginatedItems" :key="it.id">
          <div class="card-body">
            <div class="card-title">{{ it.name || '未命名音乐' }}</div>
            
          </div>
          <div class="card-actions">
            <el-button type="primary" :disabled="!it.url" @click="openAudio(it)" size="default">
              <svg viewBox="0 0 24 24" width="16" height="16" style="margin-right: 4px;">
                <polygon points="5,3 19,12 5,21" fill="currentColor"/>
              </svg>
              播放
            </el-button>
            <el-button type="danger" :disabled="deleteLoading === it.id" @click="deleteItem(it)" size="default">
              <svg viewBox="0 0 24 24" width="16" height="16" style="margin-right: 4px;">
                <path d="M19,4H15.5l-1-1h-5l-1,1H5V6h14M6,19a2,2 0 0,0 2,2h8a2,2 0 0,0 2,-2V7H6v12z" fill="currentColor"/>
              </svg>
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="playingItem" class="modal-overlay" @click.self="closePlaying">
      <div class="audio-modal">
        <el-button class="modal-close" circle @click="closePlaying" aria-label="关闭" title="关闭">×</el-button>
        <audio ref="audioRef" :key="(playingItem as any).url" :src="(playingItem as any).url" controls autoplay preload="auto"></audio>
      </div>
    </div>

    <div v-if="showCreate" class="modal-overlay">
      <div class="create-modal">
        <div class="create-header">
          <h3 class="create-title">新增音乐</h3>
        </div>
        <div class="create-content">
          <div class="create-form">
            <div class="form-row">
              <label class="form-label">名称</label>
              <div class="form-control">
                <input ref="nameInputRef" type="text" v-model="name" maxlength="100" placeholder="请输入音乐名称" />
                <div class="help">最长 100 字</div>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">音频</label>
              <div class="form-control">
                <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/aac,audio/flac" @change="onFileChange" />
                <div class="file-meta">{{ file ? `${file.name} · ${bytesToSize(file.size)}` : '未选择文件' }}</div>
                <div class="help">支持 MP3/WAV/AAC/FLAC，建议 ≤ 100MB</div>
              </div>
            </div>
            <div v-if="uploading" class="status">正在上传…</div>
            <div v-if="error" class="error">{{ error }}</div>
            <div v-if="deleteError" class="error">{{ deleteError }}</div>
          </div>
        </div>
        <div class="create-footer">
          <el-button @click="closeCreate">取消</el-button>
          <el-button type="primary" :disabled="!canSubmit() || uploading" @click="submit">上传</el-button>
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
      <div v-else-if="!listLoading && !listError" class="empty">暂无音乐数据</div>
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
  font-size: 24px; 
  font-weight: 700; 
  color: #1f2937; 
  margin: 0; 
}
.form-row { display: grid; grid-template-columns: 80px 1fr; gap: 16px; align-items: start; margin-bottom: 20px; }
.form-label { color: #374151; padding-top: 8px; font-weight: 500; }
.form-control input[type='text'] { width: 100%; }
.form-control input[type='text'],
.form-control input[type='file'] { padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; transition: all 0.2s ease; }
.form-control input[type='file'] { padding: 10px 14px; }
.form-control input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
.file-meta { margin-top: 8px; font-size: 13px; color: #6b7280; font-weight: 500; }
label { font-size: 14px; color: #333; margin-bottom: 6px; }
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
.list-block { 
  margin-top: 0; 
  background: #fff; 
  border-radius: 12px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
  overflow: hidden; 
}
.cards { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
  gap: 20px; 
  padding: 24px; 
}
.card { 
  background: #fff; 
  border: 1px solid #e5e7eb; 
  border-radius: 16px; 
  overflow: hidden; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.08); 
  display: flex; 
  flex-direction: column; 
  transition: all 0.3s ease; 
}
.card:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 24px rgba(0,0,0,0.12); 
  border-color: #d1d5db; 
}
.card-body { 
  padding: 20px; 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  text-align: center; 
}
.card-title { 
  font-weight: 700; 
  color: #111827; 
  font-size: 16px; 
  margin-bottom: 8px; 
}
.card-meta { margin-top: 6px; font-size: 13px; color: #6b7280; }
.card-links { margin-top: 10px; font-size: 12px; color: #374151; word-break: break-all; }
.card-actions { 
  padding: 16px 20px; 
  border-top: 1px solid #f3f4f6; 
  display: flex; 
  gap: 12px; 
  margin-top: auto; 
  background: #f9fafb; 
  justify-content: center; 
}
.card-actions .el-button {
  margin: 0;
}
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000; backdrop-filter: blur(4px); }
.audio-modal { background: #fff; border-radius: 16px; padding: 24px; max-width: 600px; width: 100%; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
.audio-modal audio { width: 100%; border-radius: 8px; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.9); color: #fff; border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); font-size: 24px; line-height: 1; z-index: 2; transition: all 0.2s ease; }
.modal-close:hover { background: rgba(220, 38, 38, 0.95); transform: scale(1.1); }
.create-modal { background: #fff; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); padding: 32px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; }
.create-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; }
.create-title { color: #1f2937; font-weight: 700; font-size: 24px; margin: 0; }
.create-content { display: block; }
.create-form .help { margin-top: 8px; font-size: 13px; color: #6b7280; font-weight: 500; }
.create-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #f3f4f6; }
@media (max-width: 720px) { 
  .create-content { display: block; }
  .cards { grid-template-columns: 1fr; }
  .toolbar { flex-direction: column; align-items: flex-start; gap: 12px; }
  .create-modal { padding: 24px 16px; }
}

@media (max-width: 480px) {
  .card-actions { flex-direction: column; }
  .form-row { grid-template-columns: 1fr; }
}

/* Pagination Styles */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
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
  border-top: 1px solid #f3f4f6;
  background: #fafafa;
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
    padding: 16px;
    gap: 16px;
  }
  
  .pagination {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .pagination-buttons {
    justify-content: center;
  }
  
  .card-actions {
    padding: 12px 16px;
  }
}
</style>

<script lang="ts">
export default {}
</script>
