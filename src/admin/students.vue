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
    students.value = Array.isArray(data) ? (data as any) : []
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
  chart.setOption(option)
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
    return first.toUpperCase()
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
    const arr = Array.isArray(data) ? (data as any) : (data ? [data as any] : [])
    statsDates.value = arr.map((x: any) => String(x.date || ''))
    statsLearning.value = arr.map((x: any) => Number(x.learning_count || 0))
    statsSurvey.value = arr.map((x: any) => Number(x.survey_count || 0))
    if (chart) {
      chart.setOption({
        xAxis: { data: statsDates.value },
        series: [
          { type: 'bar', data: statsLearning.value, itemStyle: { color: '#8b5cf6', borderRadius: [19, 19, 0, 0] }, barWidth: '40%' },
          { type: 'line', data: statsSurvey.value, smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
        ],
      })
    }
  } catch {}
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
    studentCount.value = Array.isArray(s) ? s.length : 0
    teacherCount.value = Array.isArray(t) ? t.length : 0
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
    courseCount.value = Array.isArray(c) ? c.length : 0
    surveyCount.value = Array.isArray(s) ? s.length : 0
    videoCount.value = Array.isArray(v) ? v.length : 0
    musicCount.value = Array.isArray(m) ? m.length : 0
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

        <!-- <div class="card quick-actions">
          <el-button type="primary">导出报告</el-button>
          <el-button>查看录像</el-button>
          <el-button type="danger">归档记录</el-button>
        </div> -->
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
.students-page { padding: 16px; }
.grid { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
.main { display: grid; gap: 16px; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,.06); }
.header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; }
.title { font-weight: 700; color: #111827; }
.actions { display: flex; gap: 8px; }

.filters { padding: 16px 18px; }
.filters-grid { display: grid; grid-template-columns: minmax(260px, 1.4fr) minmax(200px, 1fr) auto; column-gap: 16px; row-gap: 12px; align-items: end; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field.actions { flex-direction: row; justify-content: flex-end; align-items: center; gap: 8px; }
.field label { color: #374151; font-size: 13px; }
.row { display: grid; grid-template-columns: 1fr 28px 1fr; gap: 10px; align-items: center; }
.row .to { text-align: center; color: #6b7280; }
input[type='text'] { height: 36px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.row :deep(.el-date-editor) { width: 100%; height: 36px; }

.table { padding: 10px 0; overflow: hidden; }
.table-head { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; padding: 10px 16px; border-bottom: 1px solid #eef2f7; color: #6b7280; }
.table-rows .row { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr; padding: 12px 16px; align-items: center; border-bottom: 1px dashed #eef2f7; }
.badge { padding: 4px 8px; border-radius: 9999px; font-size: 12px; }
.badge.完成课程 { background: #dcfce7; color: #166534; }
.badge.课程中 { background: #fef3c7; color: #92400e; }
.badge.未完成 { background: #fee2e2; color: #991b1b; }
.link { background: transparent; border: none; color: var(--primary, #8b5cf6); cursor: pointer; }
.table-foot { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; }
.pager { display: flex; gap: 8px; }

.chart { padding: 14px 16px; }
.chart-title { color: #374151; margin-bottom: 8px; }
.chart-box { height: 260px; border-radius: 12px; background: #fff; box-shadow: inset 0 0 0 1px #eef2f7; }

.profile { display: flex; flex-direction: column; gap: 16px; }
.profile-card { padding: 16px; background: #FEF3C7; border-radius: 16px; }
.profile-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.profile-title { font-weight: 700; color: #111827; font-size: 16px; }
.edit-link { background: transparent; border: none; color: #3B82F6; cursor: pointer; font-size: 14px; }
.edit-link:hover { text-decoration: underline; }
.profile-inner { background: #fff; border-radius: 16px; padding: 16px; box-shadow: inset 0 0 0 1px #e5e7eb; }
.avatar { width: 72px; height: 72px; border-radius: 50%; background: #e5e7eb; margin: 8px auto 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #374151; font-size: 28px; }
.profile-table { display: grid; }
.profile-row { display: grid; grid-template-columns: 120px 1fr; align-items: center; height: 40px; border-bottom: 1px solid #E5E7EB; }
.profile-row:last-child { border-bottom: none; }
.label { color: #6B7280; font-size: 13px; }
.value { color: #111827; font-weight: 600; font-size: 14px; }

.metrics-card { padding: 14px 16px; }
.section-title { font-weight: 600; color: #374151; margin-bottom: 8px; }
.metric { display: grid; grid-template-columns: 120px 1fr 60px; align-items: center; gap: 8px; margin: 8px 0; }
.bar-wrap { height: 10px; background: #f1f5f9; border-radius: 9999px; overflow: hidden; }
.bar-wrap .bar { height: 100%; border-radius: 9999px; }

.users-stats { padding: 14px 16px; }
.stats-title { color: #374151; margin-bottom: 8px; }
.stats-chart { height: 160px; border-radius: 12px; background: #fff; box-shadow: inset 0 0 0 1px #eef2f7; }

.resources-stats { padding: 14px 16px; }

.quick-actions { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; justify-content: center; align-items: center; }
.quick-actions :deep(.el-button) { width: 100%; height: 36px; border-radius: 10px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000; }
.create-modal { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 20px; max-width: 520px; width: 100%; }
.create-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.create-title { color: #2563eb; font-weight: 700; font-size: 20px; }
.create-content { display: block; }
.create-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
.form-row { display: grid; grid-template-columns: 72px 1fr; gap: 12px; align-items: start; margin-bottom: 12px; }
.form-label { color: #374151; padding-top: 6px; }
.form-control input { width: 100%; padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 8px; }
.form-control select { width: 100%; height: 36px; padding: 0 10px; border: 1px solid #e0e0e0; border-radius: 8px; }

@media (max-width: 960px) {
  .grid { grid-template-columns: 1fr; }
  .filters-grid { grid-template-columns: 1fr; }
  .field.actions { justify-content: flex-start; }
}
</style>

<script lang="ts">
export default {}
</script>
