<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { apiJson, apiFetch } from '@/utils/request'
import { ElMessageBox } from 'element-plus'
import { bytesToSize } from '@/utils'

const name = ref('')
const file = ref<File | null>(null)
const coverFile = ref<File | null>(null)
const uploading = ref(false)
const result = ref<{ id?: number; video_url?: string; cover_url?: string; message?: string } | null>(null)
const error = ref<string | null>(null)
const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  file.value = input.files && input.files[0] ? input.files[0] : null
  if (file.value) {
    const isVideo = file.value.type.startsWith('video/')
    const maxSize = 500 * 1024 * 1024
    if (!isVideo) {
      error.value = '文件类型不支持，请选择视频文件'
      file.value = null
    } else if (file.value.size > maxSize) {
      error.value = '文件过大，建议 ≤ 500MB'
      file.value = null
    } else {
      error.value = null
    }
  }
}

const onCoverChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  coverFile.value = input.files && input.files[0] ? input.files[0] : null
  if (coverFile.value) {
    const isImage = coverFile.value.type.startsWith('image/')
    const maxSize = 10 * 1024 * 1024 // 10MB for cover images
    if (!isImage) {
      error.value = '封面文件类型不支持，请选择图片文件'
      coverFile.value = null
    } else if (coverFile.value.size > maxSize) {
      error.value = '封面文件过大，建议 ≤ 10MB'
      coverFile.value = null
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
  fd.append('video', file.value as File)
  if (coverFile.value) {
    fd.append('cover', coverFile.value)
  }
  try {
    const data = await apiJson('api/v1/videos/upload', {
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
  coverFile.value = null
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

// Pagination
const currentPage = ref(1)
const pageSize = ref(9) // 9 cards per page for better visual layout
const totalCount = ref(0)

const loadList = async () => {
  listLoading.value = true
  listError.value = null
  items.value = []
  try {
    const data = await apiJson('api/v1/videos/')
    items.value = data.items
    totalCount.value = data.items.length // Set total count for pagination
  } catch (e: any) {
    listError.value = e?.message || '网络错误'
  } finally {
    listLoading.value = false
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

const openVideo = (it: any) => {
  if (!(it?.video_url || it?.video)) return
  playingItem.value = it
}
const closePlaying = () => {
  playingItem.value = null
}

const downloadingId = ref<number | null>(null)
const downloadError = ref<string | null>(null)
const downloadVideo = async (it: any) => {
  if (!it?.id) return
  downloadingId.value = it.id
  downloadError.value = null
  try {
    const res = await apiFetch(`api/v1/videos/${it.id}/download`)
    if (!res.ok) throw new Error(`请求失败(${res.status})`)
    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition') || ''
    let filename = ''
    const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i)
    filename = decodeURIComponent(m?.[1] || m?.[2] || `video_${it.id}.mp4`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    downloadError.value = e?.message || '下载失败'
  } finally {
    downloadingId.value = null
  }
}

const deleteLoading = ref<number | null>(null)
const deleteError = ref<string | null>(null)
const deleteVideo = async (it: any) => {
  if (!it?.id) return
  try {
    await ElMessageBox.confirm('确定删除该视频？', '提示', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch {
    return
  }
  deleteLoading.value = it.id
  deleteError.value = null
  try {
    await apiJson(`api/v1/videos/${it.id}`, { method: 'DELETE' })
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
      <h2>视频管理</h2>
      <el-button type="primary" @click="openCreate">新增视频</el-button>
    </div>

    <div class="list-block">
      <div v-if="listLoading" class="status">正在获取列表…</div>
      <div v-if="listError" class="error">{{ listError }}</div>
      <div v-if="paginatedItems.length" class="cards">
        <div class="card" v-for="it in paginatedItems" :key="it.id">
          <div class="card-cover">
            <img v-if="it.cover_url || it.cover" :src="it.cover_url || it.cover" alt="cover" />
            <div v-else class="cover-placeholder">无封面</div>
          </div>
          <div class="card-body">
            <div class="card-title">{{ it.name || '未命名视频' }}</div>
          </div>
          <div class="card-actions">
            <el-button type="primary" :disabled="!(it.video_url || it.video)" @click="openVideo(it)">播放</el-button>
            <el-button :disabled="downloadingId === it.id" @click="downloadVideo(it)">下载</el-button>
            <el-button type="danger" :disabled="deleteLoading === it.id" @click="deleteVideo(it)">删除</el-button>
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
      <div v-else-if="!listLoading && !listError" class="empty">暂无视频数据</div>
    </div>
  </div>

  <div v-if="playingItem" class="modal-overlay" @click.self="closePlaying">
    <div class="video-modal">
      <el-button class="video-close" circle @click="closePlaying" aria-label="关闭视频" title="关闭">×</el-button>
      <video
        :src="(playingItem as any).video_url || (playingItem as any).video"
        :poster="(playingItem as any).cover_url || (playingItem as any).cover"
        controls
        autoplay
        playsinline
      ></video>
    </div>
  </div>

  <div v-if="showCreate" class="modal-overlay">
      <div class="create-modal">
        <div class="create-header">
          <h3 class="create-title">新增视频</h3>
        </div>
        <div class="create-content">
          <div class="create-form">
            <div class="form-row">
              <label class="form-label">名称</label>
              <div class="form-control">
                <input ref="nameInputRef" type="text" v-model="name" maxlength="100" placeholder="请输入视频名称" />
                <div class="help">最长 100 字</div>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">视频</label>
              <div class="form-control">
                <input type="file" accept="video/mp4,video/quicktime,video/x-msvideo" @change="onFileChange" />
                <div class="file-meta">{{ file ? `${file.name} · ${bytesToSize(file.size)}` : '未选择文件' }}</div>
                <div class="help">支持 MP4/MOV/AVI，建议 ≤ 500MB</div>
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">封面图</label>
              <div class="form-control">
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" @change="onCoverChange" />
                <div class="file-meta">{{ coverFile ? `${coverFile.name} · ${bytesToSize(coverFile.size)}` : '未选择文件（可选）' }}</div>
                <div class="help">支持 JPG/JPEG/PNG/WebP，建议 ≤ 10MB</div>
              </div>
            </div>
            <div v-if="uploading" class="status">正在上传…</div>
            <div v-if="error" class="error">{{ error }}</div>
          </div>
        </div>
        <div class="create-footer">
          <el-button @click="closeCreate">取消</el-button>
          <el-button type="primary" :disabled="!canSubmit() || uploading" @click="submit">上传</el-button>
        </div>
      </div>
    </div>
    <div v-if="downloadError" class="error">{{ downloadError }}</div>
    <div v-if="deleteError" class="error">{{ deleteError }}</div>
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
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}
.form-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 12px;
  align-items: start;
  margin-bottom: 12px;
}
.form-label {
  color: #374151;
  padding-top: 6px;
}
.form-control input[type='text'] {
  width: 100%;
}
.form-control input[type='text'],
.form-control input[type='file'] {
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
.form-control input[type='file'] {
  padding: 8px 10px;
}
.form-control input:focus {
  border-color: #3b82f6;
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}
.file-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
label {
  font-size: 14px;
  color: #333;
  margin-bottom: 6px;
}
input[type='text'] {
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
input[type='file'] {
  padding: 6px 0;
}
.actions {
  margin-top: 10px;
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
.result {
  margin-top: 12px;
  color: #333;
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
  border-radius: 12px; 
  overflow: hidden; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
  display: flex; 
  flex-direction: column; 
  transition: all 0.2s ease;
}
.card:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 20px rgba(0,0,0,0.08); 
  border-color: #d1d5db; 
}
.card-cover { 
  height: 180px; 
  background: #f5f7fa; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.card-cover img { 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
  display: block;
  transition: transform 0.3s ease;
}
.card:hover .card-cover img {
  transform: scale(1.05);
}
.cover-placeholder { 
  color: #9ca3af; 
  font-size: 14px;
  font-weight: 500;
}
.card-body {
  padding: 16px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.card-title { 
  font-weight: 700; 
  color: #111827; 
  font-size: 16px;
  margin-bottom: 8px;
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
}
.card-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}
.card-links { margin-top: 8px; font-size: 12px; color: #6b7280; word-break: break-all; }
.card-actions { 
  padding: 16px 20px; 
  border-top: 1px solid #e5e7eb; 
  display: flex;
  gap: 8px;
  background: #f9fafb;
}
.card-actions .el-button {
  flex: 1;
  margin: 0;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}
.video-modal {
  background: #000;
  border-radius: 12px;
  padding: 12px;
  max-width: 1000px;
  width: 92vw;
  position: relative;
  overflow: hidden;
}
.video-modal video {
  width: 100%;
  height: auto;
  max-height: 80vh;
  border-radius: 8px;
  position: relative;
  z-index: 1;
}
.video-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  font-size: 22px;
  line-height: 1;
  z-index: 2;
}
.video-close:hover {
  background: rgba(0, 0, 0, 0.75);
  transform: scale(1.05);
}

.create-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  max-width: 800px;
  width: 100%;
}
.create-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.create-title {
  color: #2563eb;
  font-weight: 700;
  font-size: 20px;
}
.create-content {
  display: block;
}
.create-form .help {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
.create-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
}
@media (max-width: 720px) {
  .create-content {
    display: block;
  }
}

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
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
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
  
  .card-cover {
    height: 150px;
  }
  
  .card-actions {
    padding: 12px 16px;
  }
  
  .card-actions .el-button {
    font-size: 12px;
    padding: 8px 12px;
  }
}
</style>

<script lang="ts">
export default {}
</script>
