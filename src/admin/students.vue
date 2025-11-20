<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElDatePicker } from 'element-plus'
import * as echarts from 'echarts'
import { apiJson } from '@/utils/request'

type Student = {
  user_id: number
  username: string
  name: string | null
  status: string
  total_courses: number | null
  learn_times: number | null
}

const filters = ref({
  from: '',
  to: '',
  name: '',
})

const students = ref<Student[]>([])
const listLoading = ref(false)
const listError = ref<string | null>(null)
const loadCourseStatus = async () => {
  listLoading.value = true
  listError.value = null
  students.value = []
  try {
    const data = await apiJson('api/v1/users/course_status')
    students.value = Array.isArray(data?.items) ? (data.items as any) : []
  } catch (e: any) {
    listError.value = e?.message || '网络错误'
  } finally {
    listLoading.value = false
  }
}

const page = ref(1)
const pageSize = ref(5)

const filtered = computed(() => {
  let list = students.value
  const q = String(filters.value.name || '').trim().toLowerCase()
  if (q) list = list.filter(s => String(s.name || s.username || '').toLowerCase().includes(q))
  return list
})

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const selected = ref<Student | null>(null)
const selectStudent = (s: Student) => {
  selected.value = s
}

const resetFilters = () => {
  filters.value = { from: '', to: '', name: '' }
}

const showCreate = ref(false)
const createUsername = ref('')
const createPassword = ref('')
const createRole = ref('student')
const createLoading = ref(false)
const createError = ref<string | null>(null)
const createResult = ref<any>(null)
const openCreate = () => {
  createUsername.value = ''
  createPassword.value = ''
  createRole.value = 'student'
  createError.value = null
  createResult.value = null
  showCreate.value = true
}
const closeCreate = () => {
  showCreate.value = false
}
const canCreate = () => {
  const u = createUsername.value.trim()
  const p = createPassword.value.trim()
  return u.length >= 3 && u.length <= 50 && p.length >= 6 && p.length <= 64
}
const addStudent = async () => {
  if (!canCreate() || createLoading.value) return
  createLoading.value = true
  createError.value = null
  createResult.value = null
  try {
    const headers = { 'Content-Type': 'application/json' }
    const body = JSON.stringify({ username: createUsername.value.trim(), password: createPassword.value.trim(), role: createRole.value })
    const data = await apiJson('api/v1/users/', { method: 'POST', headers, body })
    createResult.value = data
    showCreate.value = false
  } catch (e: any) {
    createError.value = e?.message || '网络错误'
  } finally {
    createLoading.value = false
  }
}

const metrics = ref([
  { label: '情绪稳定值', value: 7.8, color: '#22c55e' },
  { label: '压力指数', value: 4.5, color: '#f59e0b' },
  { label: '专注力提升', value: 6.7, color: '#6366f1' },
])

const statsDates = ref<string[]>([])
const statsLearning = ref<number[]>([])
const statsSurvey = ref<number[]>([])

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
const usersChartRef = ref<HTMLDivElement | null>(null)
let usersChart: echarts.ECharts | null = null
const studentCount = ref(0)
const teacherCount = ref(0)
const resourcesChartRef = ref<HTMLDivElement | null>(null)
let resourcesChart: echarts.ECharts | null = null
const courseCount = ref(0)
const surveyCount = ref(0)
const videoCount = ref(0)
const musicCount = ref(0)
const initChart = () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  console.log('Initializing chart with data:', {
    dates: statsDates.value,
    learning: statsLearning.value,
    survey: statsSurvey.value
  })
  const option: echarts.EChartsOption = {
    grid: { left: 24, right: 24, top: 16, bottom: 24 },
    xAxis: {
      type: 'category',
      data: statsDates.value.length ? statsDates.value : [],
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#eef2f7' } },
      axisLabel: { color: '#6b7280' },
    },
    tooltip: { trigger: 'axis' },
    series: [
      {
        type: 'bar',
        data: statsLearning.value,
        itemStyle: { color: '#8b5cf6', borderRadius: [19, 19, 0, 0] },
        barWidth: '40%',
      },
      {
        type: 'line',
        data: statsSurvey.value,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
      },
    ],
  }
  console.log('Chart option:', option)
  chart.setOption(option)
  console.log('Chart initialized and option set')
}

const resize = () => { chart?.resize(); usersChart?.resize() }

onMounted(() => {
  initChart()
  window.addEventListener('resize', resize)
  loadMe()
  loadStats()
  loadCourseStatus()
  loadUserCounts()
  loadResourceCounts()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
  usersChart?.dispose()
  usersChart = null
  resourcesChart?.dispose()
  resourcesChart = null
})

const completionPercent = computed(() => 0)

const me = ref<any | null>(null)
const loadMe = async () => {
  try {
    me.value = await apiJson('api/v1/users/me')
  } catch {}
}
const avatarInitial = computed(() => {
  const raw = String(me.value?.name || me.value?.username || '').trim()
  if (!raw) return ''
  const first = raw[0]
  try {
    return first ? first.toUpperCase() : ''
  } catch {
    return first
  }
})
const meCompletionPercent = computed(() => {
  const c = Number(me.value?.completed_courses ?? 0)
  const t = Number(me.value?.total_courses ?? 0)
  if (!t) return 0
  return Math.round((c / t) * 100)
})
const fmtDate = (s: string) => {
  try {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return s
    const Y = d.getFullYear()
    const M = String(d.getMonth() + 1).padStart(2, '0')
    const D = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${Y}-${M}-${D} ${h}:${m}:${ss}`
  } catch {
    return s
  }
}
const loadStats = async () => {
  try {
    const data = await apiJson('api/v1/records/stats/report')
    console.log('Stats data received:', data)
    const arr = Array.isArray(data) ? (data as any) : (data ? [data as any] : [])
    console.log('Processed array:', arr)
    statsDates.value = arr.map((x: any) => String(x.date || ''))
    statsLearning.value = arr.map((x: any) => Number(x.learning_count || 0))
    statsSurvey.value = arr.map((x: any) => Number(x.survey_count || 0))
    console.log('Stats dates:', statsDates.value)
    console.log('Stats learning:', statsLearning.value)
    console.log('Stats survey:', statsSurvey.value)
    if (chart) {
      chart.setOption({
        xAxis: { data: statsDates.value },
        series: [
          { type: 'bar', data: statsLearning.value, itemStyle: { color: '#8b5cf6', borderRadius: [19, 19, 0, 0] }, barWidth: '40%' },
          { type: 'line', data: statsSurvey.value, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
        ],
      })
      console.log('Chart updated successfully')
    } else {
      console.log('Chart not initialized')
    }
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}
const initUsersChart = () => {
  if (!usersChartRef.value) return
  if (!usersChart) usersChart = echarts.init(usersChartRef.value)
  const option: echarts.EChartsOption = {
    grid: { left: 24, right: 24, top: 16, bottom: 16 },
    xAxis: { type: 'category', data: ['学生', '老师'], axisLine: { lineStyle: { color: '#e5e7eb' } }, axisTick: { show: false }, axisLabel: { color: '#6b7280' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f7' } }, axisLabel: { color: '#6b7280' }, min: 0 },
    tooltip: { trigger: 'axis' },
    series: [
      { type: 'bar', data: [studentCount.value, teacherCount.value], itemStyle: { color: '#8b5cf6', borderRadius: [19, 19, 0, 0] }, barWidth: '40%' },
    ],
  }
  usersChart.setOption(option)
}
const loadUserCounts = async () => {
  try {
    const s = await apiJson('api/v1/users/list', { role: 'student' })
    const t = await apiJson('api/v1/users/list', { role: 'teacher' })
    studentCount.value = Array.isArray(s?.items) ? s.items.length : 0
    teacherCount.value = Array.isArray(t?.items) ? t.items.length : 0
    initUsersChart()
  } catch {}
}
const initResourcesChart = () => {
  if (!resourcesChartRef.value) return
  if (!resourcesChart) resourcesChart = echarts.init(resourcesChartRef.value)
  const option: echarts.EChartsOption = {
    grid: { left: 24, right: 24, top: 16, bottom: 16 },
    xAxis: { type: 'category', data: ['课程', '问卷', '视频', '音乐'], axisLine: { lineStyle: { color: '#e5e7eb' } }, axisTick: { show: false }, axisLabel: { color: '#6b7280' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f7' } }, axisLabel: { color: '#6b7280' }, min: 0 },
    tooltip: { trigger: 'axis' },
    series: [
      { type: 'bar', data: [courseCount.value, surveyCount.value, videoCount.value, musicCount.value], itemStyle: { color: '#8b5cf6', borderRadius: [19, 19, 0, 0] }, barWidth: '40%' },
    ],
  }
  resourcesChart.setOption(option)
}
const loadResourceCounts = async () => {
  try {
    const [c, s, v, m] = await Promise.all([
      apiJson('api/v1/courses/simple'),
      apiJson('api/v1/surveys'),
      apiJson('api/v1/videos/'),
      apiJson('api/v1/music/'),
    ])
    courseCount.value = Array.isArray(c?.items) ? c.items.length : 0
    surveyCount.value = Array.isArray(s?.items) ? s.items.length : 0
    videoCount.value = Array.isArray(v?.items) ? v.items.length : 0
    musicCount.value = Array.isArray(m?.items) ? m.items.length : 0
    initResourcesChart()
  } catch {}
}
const statusLabel = (s: string) => {
  if (s === 'finished') return '完成课程'
  if (s === 'ongoing') return '课程中'
  return '未完成'
}
</script>

<template>
  <div class="students-page">
    <div class="grid">
      <section class="main">
        <div class="card header">
          <div class="title">学员管理</div>
          <div class="actions">
            <el-button type="primary" @click="openCreate">新增学员</el-button>
          </div>
        </div>

        <div class="card filters">
          <div class="filters-grid">
            <div class="field">
              <label>日期范围</label>
              <div class="row">
                <ElDatePicker v-model="filters.from" type="date" placeholder="选择日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
                <span class="to">至</span>
                <ElDatePicker v-model="filters.to" type="date" placeholder="选择日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
              </div>
            </div>
            <div class="field">
              <label>学员姓名</label>
              <input type="text" placeholder="输入姓名" v-model="filters.name" />
            </div>
            <div class="field actions">
              <el-button type="primary">查询</el-button>
              <el-button @click="resetFilters">重置</el-button>
            </div>
          </div>
        </div>

        <div class="status" v-if="listLoading">正在获取学籍状态…</div>
        <div class="error" v-if="listError">{{ listError }}</div>

        <div class="card table">
          <div class="table-head">
            <span>学员姓名</span>
            <span>状态</span>
            <span>总课程数</span>
            <span>学习次数</span>
          </div>
          <div class="table-rows">
            <div class="row" v-for="s in paged" :key="s.user_id">
              <span>{{ s.name || s.username }}</span>
              <span>
                <span class="badge" :class="statusLabel(s.status)">{{ statusLabel(s.status) }}</span>
              </span>
              <span>{{ s.total_courses ?? 0 }}</span>
              <span>{{ s.learn_times ?? 0 }}</span>
            </div>
          </div>
          <div class="table-foot">
            <span>显示 1-{{ pageSize }} 条，共 {{ filtered.length }} 条</span>
            <div class="pager">
              <el-button disabled>‹</el-button>
              <el-button type="primary">{{ page }}</el-button>
              <el-button disabled>›</el-button>
            </div>
          </div>
        </div>

        <div class="card chart">
          <div class="chart-title">学员状态分析（最近7天）</div>
          <div class="chart-box" ref="chartRef"></div>
        </div>
      </section>

      <aside class="profile">
        <div class="card profile-card" v-if="me">
          <div class="profile-header">
            <div class="profile-title">{{ (me as any).name ?? (me as any).username }}的学员档案</div>
          </div>
          <div class="profile-inner">
            <div class="avatar" :aria-label="(me as any).name ?? (me as any).username">{{ avatarInitial }}</div>
          <div class="profile-table">
            <div class="profile-row"><span class="label">姓名</span><span class="value">{{ (me as any).name ?? '—' }}</span></div>
            <div class="profile-row"><span class="label">当前状态</span><span class="value">{{ (me as any).learning_status ?? '—' }}</span></div>
            <div class="profile-row"><span class="label">注册日期</span><span class="value">{{ fmtDate((me as any).registered_at) }}</span></div>
          </div>
        </div>
        </div>

        <div class="card users-stats">
          <div class="stats-title">人员统计</div>
          <div class="stats-chart" ref="usersChartRef"></div>
        </div>

        <div class="card resources-stats">
          <div class="stats-title">资源统计</div>
          <div class="stats-chart" ref="resourcesChartRef"></div>
        </div>

        
      </aside>
      <div v-if="showCreate" class="modal-overlay" @click.self="closeCreate">
        <div class="create-modal">
          <div class="create-header">
            <h3 class="create-title">新增学员</h3>
          </div>
          <div class="create-content">
            <div class="create-form">
              <div class="form-row">
                <label class="form-label">用户名</label>
                <div class="form-control">
                  <input type="text" v-model="createUsername" maxlength="50" placeholder="3-50 个字符" />
                </div>
              </div>
              <div class="form-row">
                <label class="form-label">密码</label>
              <div class="form-control">
                <input type="password" v-model="createPassword" maxlength="64" placeholder="6-64 个字符" />
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">角色</label>
              <div class="form-control">
                <select v-model="createRole">
                  <option value="student">student</option>
                  <option value="teacher">teacher</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
            <div class="status" v-if="createLoading">正在创建…</div>
            <div class="error" v-if="createError">{{ createError }}</div>
          </div>
        </div>
        <div class="create-footer">
            <el-button @click="closeCreate">取消</el-button>
            <el-button type="primary" :disabled="!canCreate() || createLoading" @click="addStudent">创建</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.students-page { padding: 24px; background: #f8fafc; min-height: 100vh; }
.grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: start; }
.main { display: flex; flex-direction: column; gap: 20px; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: box-shadow 0.2s ease; }
.card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; }
.title { font-weight: 600; color: #1e293b; font-size: 18px; }
.actions { display: flex; gap: 12px; }

.filters { padding: 24px; background: #fafbfc; border-radius: 16px 16px 0 0; }
.filters-grid { display: grid; grid-template-columns: minmax(280px, 1.4fr) minmax(220px, 1fr) auto; column-gap: 20px; row-gap: 16px; align-items: end; }
.field { display: flex; flex-direction: column; gap: 10px; }
.field.actions { flex-direction: row; justify-content: flex-end; align-items: flex-end; gap: 12px; }
.field label { color: #475569; font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.row { display: grid; grid-template-columns: 1fr 32px 1fr; gap: 12px; align-items: center; }
.row .to { text-align: center; color: #64748b; font-size: 14px; font-weight: 500; }
input[type='text'] { height: 40px; padding: 0 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; font-size: 14px; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
input[type='text']:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); outline: none; }
.row :deep(.el-date-editor) { width: 100%; height: 40px; }
.row :deep(.el-input__wrapper) { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.row :deep(.el-input__wrapper:hover) { border-color: #cbd5e1; }
.row :deep(.el-input__wrapper:focus-within) { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); }

.table { padding: 0; overflow: hidden; border-radius: 0 0 16px 16px; }
.table-head { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; padding: 16px 24px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 500; font-size: 14px; background: #fafbfc; }
.table-rows { padding: 0 24px; }
.table-rows .row { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; padding: 16px 0; align-items: center; border-bottom: 1px solid #f8fafc; transition: background-color 0.2s ease; }
.table-rows .row:hover { background-color: #f8fafc; }
.table-rows .row:last-child { border-bottom: none; }
.badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; display: inline-block; }
.badge.完成课程 { background: #dcfce7; color: #166534; }
.badge.课程中 { background: #fef3c7; color: #92400e; }
.badge.未完成 { background: #fee2e2; color: #991b1b; }
.link { background: transparent; border: none; color: #8b5cf6; cursor: pointer; font-weight: 500; }
.table-foot { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background: #fafbfc; border-top: 1px solid #f1f5f9; font-size: 14px; color: #64748b; }
.pager { display: flex; gap: 8px; }
.pager .el-button { min-width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; }

.chart { padding: 24px; background: #fff; border-radius: 16px; margin-top: 20px; }
.chart-title { color: #1e293b; margin-bottom: 16px; font-weight: 600; font-size: 16px; }
.chart-box { height: 300px; border-radius: 12px; background: #fafbfc; border: 1px solid #f1f5f9; }

.profile { display: flex; flex-direction: column; gap: 20px; position: sticky; top: 24px; }
.profile-card { padding: 24px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; border: 1px solid #f59e0b; }
.profile-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.profile-title { font-weight: 600; color: #92400e; font-size: 18px; }
.edit-link { background: transparent; border: none; color: #d97706; cursor: pointer; font-size: 14px; font-weight: 500; }
.edit-link:hover { text-decoration: underline; }
.profile-inner { background: rgba(255, 255, 255, 0.9); border-radius: 12px; padding: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(245, 158, 11, 0.2); }
.avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #fff; font-size: 32px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
.profile-table { display: grid; gap: 4px; }
.profile-row { display: grid; grid-template-columns: 100px 1fr; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.1); }
.profile-row:last-child { border-bottom: none; }
.label { color: #92400e; font-size: 14px; font-weight: 500; }
.value { color: #451a03; font-weight: 600; font-size: 14px; }

.users-stats { padding: 24px; background: #fff; border-radius: 16px; border: 1px solid #e5e7eb; }
.stats-title { color: #1e293b; margin-bottom: 16px; font-weight: 600; font-size: 16px; }
.stats-chart { height: 200px; border-radius: 12px; background: #fafbfc; border: 1px solid #f1f5f9; }

.resources-stats { padding: 24px; background: #fff; border-radius: 16px; border: 1px solid #e5e7eb; }

.quick-actions { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; justify-content: center; align-items: center; }
.quick-actions :deep(.el-button) { width: 100%; height: 36px; border-radius: 10px; }

/* Enhanced button styling */
:deep(.el-button) { transition: all 0.2s ease; font-weight: 500; }
:deep(.el-button--primary) { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border: none; }
:deep(.el-button--primary:hover) { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
:deep(.el-button:not(.el-button--primary):hover) { background: #f8fafc; border-color: #cbd5e1; }

/* Status messages */
.status { padding: 12px 16px; background: #eff6ff; border-left: 4px solid #3b82f6; color: #1e40af; font-size: 14px; margin: 16px 0; border-radius: 6px; }
.error { padding: 12px 16px; background: #fef2f2; border-left: 4px solid #ef4444; color: #dc2626; font-size: 14px; margin: 16px 0; border-radius: 6px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000; backdrop-filter: blur(4px); }
.create-modal { background: #fff; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); padding: 24px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; }
.create-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.create-title { color: #1e293b; font-weight: 600; font-size: 20px; }
.create-content { display: block; }
.create-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
.form-row { display: grid; grid-template-columns: 80px 1fr; gap: 16px; align-items: start; margin-bottom: 16px; }
.form-label { color: #374151; padding-top: 8px; font-weight: 500; font-size: 14px; }
.form-control input { width: 100%; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
.form-control input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); outline: none; }
.form-control select { width: 100%; height: 40px; padding: 0 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; background: #fff; transition: border-color 0.2s ease; }
.form-control select:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); outline: none; }

@media (max-width: 1200px) {
  .grid { grid-template-columns: 1fr; gap: 20px; }
  .profile { position: static; flex-direction: row; flex-wrap: wrap; }
  .profile-card { flex: 1; min-width: 300px; }
  .users-stats { flex: 1; min-width: 250px; }
  .resources-stats { flex: 1; min-width: 250px; }
}

@media (max-width: 768px) {
  .students-page { padding: 16px; }
  .filters-grid { grid-template-columns: 1fr; gap: 16px; }
  .field.actions { justify-content: flex-start; flex-wrap: wrap; }
  .table-head { grid-template-columns: 1.2fr 1fr 1fr; padding: 12px 16px; }
  .table-rows .row { grid-template-columns: 1.2fr 1fr 1fr; padding: 12px 16px; }
  .table-head span:last-child, .table-rows .row span:last-child { display: none; }
  .profile { flex-direction: column; }
  .profile-card, .users-stats, .resources-stats { min-width: auto; }
  .chart { margin-top: 16px; }
  .chart-box { height: 250px; }
}

@media (max-width: 480px) {
  .students-page { padding: 12px; }
  .header { padding: 16px; }
  .title { font-size: 16px; }
  .filters { padding: 16px; }
  .table-head { grid-template-columns: 1fr 1fr; padding: 10px 12px; font-size: 13px; }
  .table-rows .row { grid-template-columns: 1fr 1fr; padding: 10px 12px; }
  .table-head span:nth-child(3), .table-rows .row span:nth-child(3) { display: none; }
  .chart { padding: 16px; }
  .chart-title { font-size: 14px; }
  .chart-box { height: 200px; }
}
</style>

<script lang="ts">
export default {}
</script>
