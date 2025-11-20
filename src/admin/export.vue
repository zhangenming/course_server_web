<script setup lang="ts">
import { ref } from 'vue'
import { apiJson, apiFetch } from '@/utils/request'
import { SwitchButton, Download } from '@element-plus/icons-vue'

const type = ref<'learning' | 'surveys'>('learning')
const format = ref<'json' | 'csv'>('json')
const loading = ref(false)
const error = ref<string | null>(null)
const preview = ref<any>(null)

const run = async () => {
  loading.value = true
  error.value = null
  preview.value = null
  try {
    if (format.value === 'json') {
      const data = await apiJson('api/v1/records/export', { type: type.value, format: 'json' })
      preview.value = data
    } else {
      const res = await apiFetch('api/v1/records/export', { type: type.value, format: 'csv' })
      if (!res.ok) throw new Error(`请求失败(${res.status})`)
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') || ''
      const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i)
      const filename = decodeURIComponent(m?.[1] || m?.[2] || `${type.value}_records.csv`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
  } catch (e: any) {
    error.value = e?.message || '网络错误'
  } finally {
    loading.value = false
  }
}

const downloadJson = () => {
  if (preview.value == null) return
  const blob = new Blob([JSON.stringify(preview.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${type.value}_records.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
const exportAll = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch('api/v1/export/xlsx', { page_size: 2000 })
    if (!res.ok) throw new Error(`请求失败(${res.status})`)
    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition') || ''
    const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i)
    const filename = decodeURIComponent(m?.[1] || m?.[2] || 'all_records.xlsx')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    error.value = e?.message || '网络错误'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2 class="toolbar-title">数据导出</h2>
      <div class="toolbar-subtitle">导出学习记录和问卷数据</div>
      <div class="tools">
        <div class="tool-group">
          <label class="tool-label">数据类型</label>
          <select v-model="type" class="modern-select">
            <option value="learning">学习记录</option>
            <option value="surveys">问卷记录</option>
          </select>
        </div>
        <div class="tool-group">
          <label class="tool-label">导出格式</label>
          <select v-model="format" class="modern-select">
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        <div class="action-buttons">
          <el-button type="primary" :loading="loading" @click="run" class="action-btn primary-btn">
            <el-icon><SwitchButton /></el-icon>
            <span>导出</span>
          </el-button>
          <el-button type="success" :loading="loading" @click="exportAll" class="action-btn success-btn">
            <el-icon><Download /></el-icon>
            <span>导出全部</span>
          </el-button>
          <el-button 
            :disabled="format !== 'json' || preview == null" 
            @click="downloadJson" 
            class="action-btn secondary-btn"
            :class="{ 'disabled-btn': format !== 'json' || preview == null }">
            <el-icon><Download /></el-icon>
            <span>下载JSON</span>
          </el-button>
        </div>
      </div>
    </div>

    <div class="content-area">
      <div class="content-header">
        <h3 class="content-title">数据预览</h3>
        <div class="content-stats" v-if="preview && format === 'json'">
          <span class="stat-item">{{ Object.keys(preview).length }} 个字段</span>
          <span class="stat-item">{{ JSON.stringify(preview).length }} 字符</span>
        </div>
      </div>
      
      <div class="content-card">
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">正在导出数据...</div>
        </div>
        <div v-else-if="error" class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-message">{{ error }}</div>
        </div>
        <div v-else-if="format === 'json' && preview" class="preview-container">
          <pre class="data-preview">{{ JSON.stringify(preview, null, 2) }}</pre>
        </div>
        <div v-else-if="!loading && !error && format === 'json'" class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-text">暂无预览数据</div>
          <div class="empty-subtext">请先选择导出类型并点击导出按钮</div>
        </div>
        <div v-else-if="format === 'csv' && !loading && !error" class="csv-info">
          <div class="csv-icon">📄</div>
          <div class="csv-text">CSV 格式将直接下载到本地</div>
          <div class="csv-subtext">点击导出按钮开始下载</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern color scheme and variables */
.page {
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
  --success-color: #10b981;
  --success-hover: #059669;
  --secondary-color: #6b7280;
  --secondary-hover: #4b5563;
  --background: #fafafa;
  --card-bg: #ffffff;
  --border-color: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Page layout */
.page {
  padding: 32px;
  background: var(--background);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

/* Modern toolbar */
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
  padding: 24px;
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.toolbar-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.025em;
}

.toolbar-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: -8px;
  margin-bottom: 8px;
}

.tools {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
}

.tool-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Modern select styling */
.modern-select {
  height: 42px;
  padding: 0 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--card-bg);
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: var(--transition);
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 12px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 40px;
}

.modern-select:hover {
  border-color: var(--primary-color);
}

.modern-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Action buttons */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.action-btn {
  height: 42px;
  padding: 0 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: var(--transition);
  border: none;
  cursor: pointer;
}

.primary-btn {
  background: var(--primary-color);
  color: white;
  box-shadow: var(--shadow-sm);
}

.primary-btn:hover {
  background: var(--primary-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.success-btn {
  background: var(--success-color);
  color: white;
  box-shadow: var(--shadow-sm);
}

.success-btn:hover {
  background: var(--success-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.secondary-btn {
  background: var(--secondary-color);
  color: white;
  box-shadow: var(--shadow-sm);
}

.secondary-btn:hover {
  background: var(--secondary-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.disabled-btn {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* Content area */
.content-area {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid var(--border-color);
}

.content-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.content-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.8);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.content-card {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Loading state */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Error state */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  text-align: center;
}

.error-icon {
  font-size: 32px;
  color: #ef4444;
}

.error-message {
  font-size: 14px;
  color: #ef4444;
  font-weight: 500;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 40px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
}

.empty-subtext {
  font-size: 14px;
  color: var(--text-secondary);
  opacity: 0.8;
}

/* CSV info */
.csv-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 40px;
  text-align: center;
}

.csv-icon {
  font-size: 48px;
  opacity: 0.5;
}

.csv-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
}

.csv-subtext {
  font-size: 14px;
  color: var(--text-secondary);
  opacity: 0.8;
}

/* Preview container */
.preview-container {
  width: 100%;
  max-height: 500px;
  overflow: auto;
  padding: 24px;
}

.data-preview {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  background: #f8fafc;
  padding: 20px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

/* Responsive design */
@media (max-width: 768px) {
  .page {
    padding: 16px;
  }
  
  .toolbar {
    padding: 20px;
  }
  
  .tools {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-buttons {
    margin-left: 0;
    width: 100%;
  }
  
  .tool-group {
    min-width: auto;
  }
  
  .content-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .content-stats {
    width: 100%;
    justify-content: flex-start;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .page {
    --background: #0f172a;
    --card-bg: #1e293b;
    --border-color: #334155;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>

<script lang="ts">
export default {}
</script>