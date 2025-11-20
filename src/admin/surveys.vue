<script setup lang="ts">
import { ref, nextTick, computed, onMounted } from 'vue'
import { apiJson } from '@/utils/request'

type Option = { text: string; value: number | null }
type Question = { text: string; options: Option[] }
type Range = { min: number; label: string; command?: string }

// 问卷列表数据
const surveys = ref<any[]>([])
const loading = ref(false)

// 分页状态
const currentPage = ref(1)
const pageSize = ref(8)
const totalCount = ref(0)

// 获取问卷列表
const fetchSurveys = async () => {
  loading.value = true
  try {
    const response = await apiJson('api/v1/surveys', {
      method: 'GET',
      params: {
        page: currentPage.value,
        limit: pageSize.value
      }
    })
    surveys.value = response.data || []
    totalCount.value = response.total || 0
  } catch (error) {
    console.error('获取问卷列表失败:', error)
    surveys.value = []
    totalCount.value = 0
  } finally {
    loading.value = false
  }
}

// 分页函数
const changePage = (page: number) => {
  currentPage.value = page
  fetchSurveys()
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchSurveys()
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchSurveys()
  }
}

// 计算总页数
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

// 计算可见页码
const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, currentPage.value + 2)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// 删除问卷
const deleteSurvey = async (id: string) => {
  if (!confirm('确定要删除这个问卷吗？')) return
  
  try {
    await apiJson(`api/v1/surveys/${id}`, {
      method: 'DELETE'
    })
    createMessage.value = '删除成功'
    fetchSurveys()
  } catch (error) {
    createMessage.value = '删除失败'
    console.error('删除问卷失败:', error)
  }
  setTimeout(() => (createMessage.value = ''), 2000)
}

// 切换创建模式
const showCreateForm = ref(false)

// 返回列表
const backToList = () => {
  showCreateForm.value = false
  fetchSurveys()
}

onMounted(() => {
  fetchSurveys()
})
// 改为题目列表：默认三个空白题目，每题三个空白选项
const questions = ref<Question[]>([
  {
    text: '',
    options: [
      { text: '', value: null },
      { text: '', value: null },
      { text: '', value: null },
    ],
  },
  {
    text: '',
    options: [
      { text: '', value: null },
      { text: '', value: null },
      { text: '', value: null },
    ],
  },
  {
    text: '',
    options: [
      { text: '', value: null },
      { text: '', value: null },
      { text: '', value: null },
    ],
  },
])

// 新增：输入框引用，用于添加后自动聚焦
const questionInputs = ref<HTMLInputElement[]>([])
const optionInputs = ref<HTMLInputElement[][]>([])

// 仅在提交时进行校验与提示
const shouldValidate = ref(false)

// 创建时输出的数据与提示消息
const createMessage = ref('')
// 问卷主题
const theme = ref('')
const emit = defineEmits(['created'])
const createSurvey = async () => {
  // 触发一次校验，仅在提交时显示红色提示/未填写提示
  shouldValidate.value = true
  // 组装符合要求的数据结构
  const payload = {
    theme:
      typeof theme.value === 'string' ? theme.value : String(theme.value ?? ''),
    questions: questions.value.map(q => ({
      text: q.text ?? '',
      options: q.options.map(o => ({
        text: o.text ?? '',
        value: Number.isFinite(o.value) ? o.value : 0,
      })),
    })),
    ranges: ranges.value.map(r => ({
      min: Number.isFinite(r.min) ? r.min : 0,
      label: typeof r.label === 'string' ? r.label : String(r.label ?? ''),
      command:
        typeof r.command === 'string' ? r.command : r.command ?? ('' as any),
    })),
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    await apiJson('api/v1/surveys', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    createMessage.value = '创建成功'
    emit('created')
    // 创建成功后返回列表
    showCreateForm.value = false
    fetchSurveys()
  } catch (e: any) {
    createMessage.value = e?.message || '网络错误'
  }
  setTimeout(() => (createMessage.value = ''), 2000)
}

// 添加题目：默认包含三个空白选项；新增后聚焦题干
const addQuestion = () => {
  questions.value.push({
    text: '',
    options: [
      { text: '', value: null },
      { text: '', value: null },
      { text: '', value: null },
    ],
  })
  optionInputs.value.push([])
  nextTick(() => {
    const el = questionInputs.value[questions.value.length - 1]
    el?.focus()
  })
}

// 删除题目：保留至少一题 + 删除确认 + 同步输入引用
const removeQuestion = (index: number) => {
  if (questions.value.length <= 1) return
  questions.value.splice(index, 1)
  questionInputs.value.splice(index, 1)
  optionInputs.value.splice(index, 1)
}

// 添加选项：新增后聚焦新选项
const addOption = (qi: number) => {
  if (questions.value[qi] && questions.value[qi].options) {
    questions.value[qi].options.push({ text: '', value: null })
    nextTick(() => {
      const arr = optionInputs.value[qi] || []
      const el = arr[arr.length - 1]
      el?.focus()
    })
  }
}

// 如果后续要汇总配置，可继续用 s；这里让 s.questions 指向题目列表
const ranges = ref<Range[]>([
  { min: 10, label: '不及格', command: '' },
  { min: 60, label: '及格', command: '' },
  { min: 80, label: '中等', command: '' },
  { min: 90, label: '良好', command: '' },
  { min: 100, label: '优秀', command: '' },
])

const addRange = () => {
  const lastRange = ranges.value.length > 0 ? ranges.value[ranges.value.length - 1] : null
  const lastMin = lastRange ? lastRange.min : 0
  ranges.value.push({ min: lastMin + 10, label: '', command: '' })
}
const removeRange = (i: number) => {
  if (ranges.value.length <= 1) return
  ranges.value.splice(i, 1)
}

const hasDuplicateMins = computed(() => {
  const seen = new Set<number>()
  for (const r of ranges.value) {
    if (seen.has(r.min)) return true
    seen.add(r.min)
  }
  return false
})

// 计算问卷满分
const maxScoreForSurvey = (survey: any) => {
  if (!survey.questions || !Array.isArray(survey.questions)) return 0
  return survey.questions.reduce((sum: number, q: any) => {
    if (!q.options || !Array.isArray(q.options)) return sum
    const maxOpt = q.options.reduce((m: number, o: any) => {
      const v = Number.isFinite(o.value) ? (o.value || 0) : 0
      return Math.max(m, v)
    }, 0)
    return sum + maxOpt
  }, 0)
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 编辑问卷（预留功能）
const editSurvey = (survey: any) => {
  // TODO: 实现编辑功能
  console.log('编辑问卷:', survey)
}

// 预览问卷（预留功能）
const previewSurvey = (survey: any) => {
  // TODO: 实现预览功能
  console.log('预览问卷:', survey)
}

// 统计信息：题目总数与当前满分（每题最高选项分数求和）
const totalQuestions = computed(() => questions.value.length)
const maxScore = computed(() =>
  questions.value.reduce((sum, q) => {
    if (!q.options || !Array.isArray(q.options)) return sum
    const maxOpt = q.options.reduce((m, o) => {
      const v = Number.isFinite(o.value) ? (o.value || 0) : 0
      return Math.max(m, v)
    }, 0)
    return sum + maxOpt
  }, 0)
)

// 评分规则仅用于配置，不再在此页输入“最终分数”进行测试
</script>

<template>
  <div class="survey-container">
    <!-- 问卷列表视图 -->
    <div v-if="!showCreateForm" class="survey-list">
      <div class="page-header">
        <h2 class="page-title">问卷管理</h2>
        <button class="btn btn-primary" @click="showCreateForm = true">
          创建问卷
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <!-- 问卷列表 -->
      <div v-else-if="surveys.length > 0" class="survey-grid">
        <div v-for="survey in surveys" :key="survey.id" class="survey-card">
          <div class="survey-card-header">
            <h3 class="survey-title">{{ survey.theme || '未命名问卷' }}</h3>
            <div class="survey-stats">
              <span class="stat-item">
                <i class="icon-questions"></i>
                {{ survey.questions?.length || 0 }} 题
              </span>
              <span class="stat-item">
                <i class="icon-score"></i>
                满分 {{ maxScoreForSurvey(survey) }} 分
              </span>
            </div>
          </div>
          <div class="survey-card-body">
            <div class="survey-meta">
              <span class="meta-item">创建时间: {{ formatDate(survey.createdAt) }}</span>
              <span class="meta-item">状态: {{ survey.status || '草稿' }}</span>
            </div>
          </div>
          <div class="survey-card-actions">
            <button class="btn btn-secondary" @click="editSurvey(survey)">
              编辑
            </button>
            <button class="btn btn-secondary" @click="previewSurvey(survey)">
              预览
            </button>
            <button class="btn btn-ghost" @click="deleteSurvey(survey.id)">
              删除
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>暂无问卷</h3>
        <p>点击上方按钮创建您的第一个问卷</p>
      </div>

      <!-- 分页 -->
      <div v-if="totalCount > pageSize" class="pagination">
        <button 
          class="btn btn-secondary" 
          @click="prevPage" 
          :disabled="currentPage === 1"
        >
          上一页
        </button>
        
        <div class="page-numbers">
          <button
            v-for="page in visiblePages"
            :key="page"
            class="btn"
            :class="{ 'btn-primary': page === currentPage, 'btn-secondary': page !== currentPage }"
            @click="changePage(page)"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          class="btn btn-secondary" 
          @click="nextPage" 
          :disabled="currentPage === totalPages"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- 问卷创建/编辑视图 -->
    <div v-else class="survey">
      <div class="survey-header">
        <div>
          <div class="title">创建问卷</div>
          <div class="desc">设计您的问卷题目与评分规则</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" @click="backToList">返回列表</button>
        </div>
      </div>

      <!-- 问卷主题输入 -->
      <div class="field">
        <label class="field-label">问卷主题</label>
        <input
          v-model="theme"
          class="input theme-input"
          placeholder="请输入问卷主题"
        />
      </div>

      <!-- 内容网格：题目与评分规则 -->
      <div class="content-grid">
        <!-- 左侧：题目列表 -->
        <div class="left-col">
          <div class="options-card questions-card">
            <div class="options-toolbar">
              <span class="options-title">题目设置</span>
              <button class="btn btn-primary" @click="addQuestion">添加题目</button>
            </div>

            <div class="questions-list">
              <div
                v-for="(question, qi) in questions"
                :key="qi"
                class="question-block"
              >
                <!-- 题目输入 -->
                <div class="field with-action questions-top">
                  <span class="question-index">题目 {{ qi + 1 }}</span>
                  <input
                    :ref="(el) => (questionInputs[qi] = el as HTMLInputElement)"
                    v-model="question.text"
                    class="input"
                    placeholder="请输入题目内容"
                    :class="{ invalid: shouldValidate && !question.text.trim() }"
                  />
                  <button
                    v-if="questions.length > 1"
                    class="btn btn-ghost"
                    @click="removeQuestion(qi)"
                  >
                    删除
                  </button>
                  <div v-else></div>
                </div>

                <!-- 选项列表 -->
                <div class="options-list">
                  <div class="options-header">
                    <span class="col-label">序号</span>
                    <span class="col-label">选项内容</span>
                    <span class="col-label">分数</span>
                    <span class="col-label">操作</span>
                  </div>

                  <div
                    v-for="(option, oi) in question.options"
                    :key="oi"
                    class="option-row"
                  >
                    <label class="option-label">{{ oi + 1 }}</label>
                    <input
                      v-model="option.text"
                      class="input"
                      placeholder="选项内容"
                      :class="{ invalid: shouldValidate && !option.text.trim() }"
                    />
                    <input
                      v-model.number="option.value"
                      type="number"
                      class="input score"
                      placeholder="分数"
                      :class="{ invalid: shouldValidate && !Number.isFinite(option.value) }"
                    />
                    <button
                      v-if="question.options.length > 1"
                      class="btn btn-ghost"
                      @click="question.options.splice(oi, 1)"
                    >
                      删除
                    </button>
                    <div v-else></div>
                  </div>

                  <div class="hint-row" v-if="shouldValidate && question.options.some(o => !o.text.trim() || !Number.isFinite(o.value))">
                    请完善所有选项内容与对应分数
                  </div>
                </div>

                <!-- 添加选项按钮 -->
                <div style="margin-top: 12px">
                  <button class="btn btn-secondary" @click="addOption(qi)">
                    添加选项
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：评分规则 -->
        <div class="right-col">
          <div class="options-card scoring-card">
            <div class="options-toolbar">
              <span class="options-title">评分规则</span>
              <div class="toolbar-right">
                <span class="toolbar-info">共 {{ ranges.length }} 条规则</span>
                <button class="btn btn-primary" @click="addRange">添加规则</button>
              </div>
            </div>

            <div class="options-list">
              <div class="rules-header">
                <span class="col-label">序号</span>
                <span class="col-label">最低分</span>
                <span class="col-label">等级标签</span>
                <span class="col-label">建议指令</span>
                <span class="col-label">操作</span>
              </div>

              <div
                v-for="(range, ri) in ranges"
                :key="ri"
                class="rules-row"
                :class="{ invalid: shouldValidate && hasDuplicateMins }"
              >
                <label class="option-label">{{ ri + 1 }}</label>
                <input
                  v-model.number="range.min"
                  type="number"
                  class="input score"
                  placeholder="最低分"
                  :class="{ invalid: shouldValidate && (!Number.isFinite(range.min) || hasDuplicateMins) }"
                />
                <input
                  v-model="range.label"
                  class="input"
                  placeholder="等级标签"
                  :class="{ invalid: shouldValidate && !range.label.trim() }"
                />
                <input
                  v-model="range.command"
                  class="input"
                  placeholder="建议指令"
                />
                <button
                  v-if="ranges.length > 1"
                  class="btn btn-ghost"
                  @click="removeRange(ri)"
                >
                  删除
                </button>
                <div v-else></div>
              </div>

              <div class="hint-row" v-if="shouldValidate && hasDuplicateMins">
                评分规则存在重复的最低分，请检查
              </div>
            </div>
          </div>

          <!-- 统计信息 -->
          <div class="rules-meta">
            <span>题目总数: {{ totalQuestions }}</span>
            <span>问卷满分: {{ maxScore }} 分</span>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="survey-footer">
        <div class="footer-info">
          <span v-if="createMessage" class="create-msg">{{ createMessage }}</span>
        </div>
        <div class="footer-actions">
          <button class="btn btn-secondary" @click="backToList">取消</button>
          <button class="btn btn-primary" @click="createSurvey">创建问卷</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 布局容器 */
.survey-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

/* 问卷列表网格 */
.survey-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

/* 问卷卡片 */
.survey-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.survey-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.survey-card-header {
  margin-bottom: 16px;
}

.survey-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.survey-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #6b7280;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-questions::before {
  content: "❓";
  font-size: 12px;
}

.icon-score::before {
  content: "💯";
  font-size: 12px;
}

.survey-card-body {
  flex: 1;
  margin-bottom: 20px;
}

.survey-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

.meta-item {
  display: flex;
  align-items: center;
}

.survey-card-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.empty-state p {
  font-size: 16px;
  margin: 0;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.page-numbers {
  display: flex;
  gap: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .survey-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .survey-card-actions {
    flex-direction: column;
  }
  
  .pagination {
    flex-wrap: wrap;
  }
}

/* 头部样式调整 */
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 原有问卷创建样式 */
.survey {
  /* 组件尽量占满屏幕宽度 */
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 24px;
  /* 所有子元素采用边框盒模型，避免由于 padding 导致宽度溢出 */
  box-sizing: border-box;
}

/* 原有问卷创建样式 */
.survey {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-sizing: border-box;
}
/* 继承给子元素，保证网格内宽度计算稳定 */
.survey * {
  box-sizing: inherit;
}
/* 原有样式保持，仅增强 header 为横向布局 */
.survey-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 顶部题目区：简洁行内删除按钮 */
.questions-top .field {
  grid-template-columns: 50px minmax(140px, 1fr) 80px 80px;
}
/* 通用：带操作按钮的字段行（与选项行四列对齐） */
.field.with-action {
  grid-template-columns: 50px minmax(0, 1fr) 84px 84px;
}
.field.with-action .btn {
  width: 100%; /* 两按钮分别占据第3、4列且等宽 */
}

.survey-header .title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}
.survey-header .desc {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}
.survey-header .theme-input {
  width: 240px;
}

/* 通用输入与字段 */
.field {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.field-label {
  font-weight: 600;
  color: #374151;
}
.input {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  background: #fff;
}
.input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* 选项卡片与工具栏 */
.options-card {
  margin-top: 16px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-left: 4px solid var(--accent-border); /* 更克制的左侧强调 */
  border-radius: 12px;
  background: #fff; /* 去掉卡片浅色底 */
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  /* 约束内部宽度，避免溢出 */
  overflow: hidden;
  max-width: 100%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.options-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.options-title {
  font-weight: 600;
  color: #374151;
}

/* 评分规则工具栏右侧信息与按钮排列 */
.scoring-card .toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}
.scoring-card .toolbar-info {
  color: #64748b; /* 更温和的中性灰，避免过多彩色文字 */
  font-size: 12px;
}

/* 底部左右两栏 */
.content-grid {
  display: grid;
  /* 改为单列堆叠：上方题目与选项，下方评分规则 */
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: start;
  max-width: 100%;
}
.left-col,
.right-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 允许列在网格中收缩，维持 50% 分配 */
  min-width: 0;
}
/* 题目块内部分隔：统一包裹在 questions-card 中 */
.question-block {
  padding: 20px;
  border-left: 3px solid var(--accent-border);
  padding-left: 24px; /* 给左侧边线留出内容间距 */
  border-radius: var(--radius);
  background: #fff;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.questions-card .question-block + .question-block {
  margin-top: 20px; /* 增大题与题之间垂直间距 */
  padding-top: 18px;
}
.right-col .options-card {
  min-height: 240px;
}

/* 表头 */
.options-header {
  display: grid;
  grid-template-columns: minmax(44px, max-content) minmax(140px, 1fr) 96px 96px;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 1px dashed #e5e7eb;
  color: #6b7280;
  font-size: 13px;
}
.col-label {
  user-select: none;
}

/* 列表与行 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 5px; /* 合并为一个整体块，不再分隔间距 */
  margin-top: 6px; /* 与题目区更紧凑衔接 */
}
.option-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 84px 84px;
  align-items: center;
  gap: 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  transition: background 0.2s;
}
.option-row + .option-row {
  border-top: 1px dashed var(--color-border-light); /* 轻分隔线，仍然是一块 */
}
.option-row .btn {
  width: 100%; /* 删除选项按钮撑满第4列，列宽视觉一致 */
}
.option-row > * {
  min-width: 0;
}
.option-row:hover {
  background: #fff; /* 悬浮时行内轻微提亮，保持整体块背景 */
}

/* 选项序号：去掉圆圈，保留简洁文本对齐 */
.option-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-weight: 600;
  color: #6b7280;
  margin-left: 6px;
  justify-self: center;
}

/* 题目序号徽标：将圆形样式转移到题目标题处 */
.question-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 6px;
  margin-left: 0;
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: var(--accent-pill-bg);
  border: 1px solid var(--accent-pill-border);
  border-radius: 9999px; /* 胶囊形，容纳“题目 N” */
}

/* 分数输入右对齐 */
.score {
  text-align: right;
  width: 100%;
}

/* 小屏优化：缩小固定列，保证内容列尽量宽 */
@media (max-width: 560px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  .options-header {
    grid-template-columns: minmax(40px, max-content) 1fr 80px 80px;
    font-size: 12px;
    gap: 8px;
  }
  .option-row {
    grid-template-columns: minmax(40px, max-content) 1fr 80px 80px;
    gap: 8px;
  }
  .field.with-action {
    grid-template-columns: minmax(40px, max-content) 1fr 80px 80px;
  }
  .rules-header {
    grid-template-columns: 48px clamp(72px, 26vw, 96px) 1fr 1fr 84px;
    font-size: 12px;
    gap: 8px;
  }
  .rules-row {
    grid-template-columns: 48px clamp(72px, 26vw, 96px) 1fr 1fr 84px;
    gap: 8px;
    padding: 8px;
  }
  .btn {
    padding: 0 8px;
  }
}

/* 去除滚动条形式的溢出处理，改用等分布局控制宽度 */

/* 行的美观与可读性增强 */
.option-row {
  border-radius: 12px;
}
/* 去掉斑马纹背景，减少视觉干扰 */
/* 按钮样式 */
.btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary-hover);
}
.btn-primary:hover {
  background: var(--color-primary-hover);
}
.btn-ghost {
  background: transparent;
  color: #ef4444;
  border-color: #fca5a5;
}
.btn-ghost:hover {
  background: #fee2e2;
}
.options-count {
  color: #6b7280;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
/* 其余样式保持不变 */
.survey-header .title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}
.survey-header .desc {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}
.input.invalid {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.btn-secondary {
  background: #f3f4f6;
  color: #111827;
  border-color: #d1d5db;
}
.btn-secondary:hover {
  background: #e5e7eb;
}
.create-msg {
  color: #059669;
  font-size: 12px;
}

/* 评分模块特殊样式：绿色强调 + 浅底 */
.scoring-card {
  border-left-color: #a7f3d0; /* 低饱和绿色强调，友好不刺眼 */
  background: var(--color-card);
  box-shadow: 0 2px 12px rgba(16, 185, 129, 0.06);
  overflow: visible;
}
.scoring-card .options-title {
  color: #065f46;
}

/* 评分模块信息行 */
.rules-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 4px 10px 0;
  color: #065f46;
  font-size: 12px;
}

/* 移动端：增大点击区域与减弱动画以提升性能 */
@media (max-width: 560px) {
  .survey {
    padding: var(--space-5);
  }
  .field {
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .input {
    height: 40px;
  }
  .btn {
    height: 36px;
    padding: 0 var(--space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}

/* 去掉重复的标题样式定义，保留一处即可 */
.survey {
  --color-bg: #fff;
  /* 更友好的中性浅灰卡片底色，减轻视觉负担 */
  --color-card: #f9fafb;
  --color-border: #e5e7eb;
  --color-border-light: #f1f5f9; /* 同色系更浅，用于题目块 */
  --color-muted: #6b7280;
  /* 主色改为更柔和的蓝色 */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-danger: #ef4444;
  --color-danger-bg: #fee2e2;
  --ring-primary: rgba(59, 130, 246, 0.12);
  --ring-danger: rgba(239, 68, 68, 0.1);
  /* 更柔和的左侧强调线与徽标色 */
  --accent-border: #cbd5e1; /* slate-300 */
  --accent-pill-bg: #f1f5f9; /* slate-100 */
  --accent-pill-border: #e2e8f0; /* slate-200 */
  --radius: 12px;
  --space-1: 6px;
  --space-2: 8px;
  --space-3: 10px;
  --space-4: 12px;
  --space-5: 16px;
  overflow-x: hidden;
}

/* 头部：粘性定位与背景/阴影，便于随时添加题目 */
.survey-header {
  position: sticky;
  top: 0;
  z-index: 5;
  padding: var(--space-3) 0;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: saturate(180%) blur(2px);
}
.header-actions {
  gap: var(--space-3);
}
.options-count {
  color: var(--color-muted);
}

/* 输入框：更大的点击区域与可视化焦点 */
.input {
  height: 36px;
  padding: 0 var(--space-3);
  border-radius: 9px;
}
/* 选项行：高度较题目行缩小约20%（36px -> 29px） */
.option-row .input {
  height: 29px;
}
.option-row .btn {
  height: 30px;
}
.input::placeholder {
  color: #9ca3af;
}
.input:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--ring-primary);
}

/* 分数错误态：更清晰的红色边框与弱提示背景 */
.input.invalid {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px var(--ring-danger);
}

/* 未填写提示 */
.hint-row {
  color: #ef4444;
  font-size: 12px;
  padding: 4px 10px 0;
}

/* 卡片与行：悬浮亮度与阴影层次，编辑时更舒服 */
.options-card {
  background: var(--color-card);
  border-left-color: #2563eb;
}
.option-row:hover {
  background: #fff; /* 与上方保持一致 */
}

/* 按钮：统一焦点态与可点区域 */
.btn {
  min-width: 80px;
}
.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ring-primary);
}
.btn-primary {
  background: var(--color-primary);
  border-color: #1e40af;
}
.btn-primary:hover {
  background: var(--color-primary-hover);
}
.btn-ghost {
  color: var(--color-danger);
  border-color: #fca5a5;
}
.btn-ghost:hover {
  background: var(--color-danger-bg);
}

/* 次级按钮：用于复制 */
.btn-secondary {
  background: #f3f4f6;
  color: #111827;
  border-color: #d1d5db;
}
.btn-secondary:hover {
  background: #e5e7eb;
}

/* 移动端：增大点击区域与减弱动画以提升性能 */
@media (max-width: 560px) {
  .survey {
    padding: var(--space-5);
  }
  .field {
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .input {
    height: 40px;
  }
  .btn {
    height: 36px;
    padding: 0 var(--space-3);
  }
  /* 移动端：选项行高度同样缩小约20%（40px -> 32px） */
  .option-row .input {
    height: 32px;
  }
  .option-row .btn {
    height: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}

/* 去掉重复的标题样式定义，保留一处即可 */
.survey-header .title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}
.survey-header .desc {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}
.input.invalid {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.btn-secondary {
  background: #f3f4f6;
  color: #111827;
  border-color: #d1d5db;
}
.btn-secondary:hover {
  background: #e5e7eb;
}
/* 评分规则的列宽（桌面端）：让 min 更窄、label 更灵活，避免溢出 */
.rules-header {
  display: grid;
  grid-template-columns:
    44px clamp(56px, 7vw, 84px) minmax(100px, 1fr) minmax(100px, 1fr)
    72px;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px dashed #e5e7eb;
  color: var(--color-muted);
  font-size: 13px;
}
.rules-row {
  display: grid;
  grid-template-columns:
    44px clamp(56px, 7vw, 84px) minmax(100px, 1fr) minmax(100px, 1fr)
    72px;
  align-items: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.rules-row > * {
  min-width: 0;
}
/* 规则列表容器也允许收缩，避免撑破右栏 */
.right-col .options-list {
  min-width: 0;
}
/* 桌面端两栏布局 */
@media (min-width: 960px) {
  .content-grid {
    grid-template-columns: minmax(460px, 0.54fr) minmax(380px, 0.46fr);
    gap: 12px;
  }
}

/* 底部固定操作区 */
.survey-footer {
  position: sticky;
  bottom: 0;
  z-index: 3;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  padding: var(--space-3) 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.survey-footer .footer-actions .btn {
  min-width: 100px;
}
</style>
