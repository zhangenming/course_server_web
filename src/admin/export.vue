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
      <h2>数据导出</h2>
      <div class="tools">
        <select v-model="type">
          <option value="learning">学习记录</option>
          <option value="surveys">问卷记录</option>
        </select>
        <select v-model="format">
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
        <el-button type="primary" :disabled="loading" @click="run">
          <el-icon><SwitchButton /></el-icon>
          导出
        </el-button>
        <el-button type="success" :disabled="loading" @click="exportAll">
          <el-icon><Download /></el-icon>
          导出全部
        </el-button>
        <el-button :disabled="format !== 'json' || preview == null" @click="downloadJson">下载JSON</el-button>
      </div>
    </div>

    <div class="content">
      <div v-if="loading" class="status">正在导出…</div>
      <div v-if="error" class="error">{{ error }}</div>
      <pre v-if="format === 'json' && preview" class="preview">{{ JSON.stringify(preview, null, 2) }}</pre>
      <div v-else-if="!loading && !error && format === 'json'" class="empty">暂无预览数据</div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.tools { display: flex; gap: 8px; align-items: center; }
.tools select { height: 32px; padding: 0 10px; border: 1px solid #e5e7eb; border-radius: 8px; }
.status { color: #6b7280; }
.error { color: #ef4444; }
.empty { color: #6b7280; }
.content { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
.preview { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; }
</style>

<script lang="ts">
export default {}
</script>