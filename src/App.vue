<script setup lang="ts">
import NextCas from '@nextcas/sdk'
import {
  Record,
  Asr
} from '@nextcas/voice';

import { onMounted, ref, computed } from 'vue'
import { createAccessToken } from './token'
import { simulateClick } from './utils'
import { replys, spks, asks } from './config'
import { apiJson, apiFetch } from '@/utils/request'
import appBg from '@/assets/bg.jpg'

const showBegin = ref(false)
const showSurvey = ref(false)
const currentQuestionIndex = ref(0)
const userAnswers = ref<number[]>([])
const selectedIndex = ref<number[]>([])
const showResult = ref(false)

type Option = { text: string; value: number }
type Question = { text: string; options: Option[] }
type Range = { min: number; label: string }

// 问题数据
const questions = ref<Question[]>([])

// 评分标准
const ranges = ref<Range[]>([])

// 计算总分
const totalScore = computed(() => {
  return userAnswers.value.reduce((sum, score) => sum + score, 0)
})

// 计算最高分
const maxScore = computed(() => {
  return questions.value.reduce((sum, q) => {
    const maxOptionValue = Math.max(...q.options.map(o => o.value))
    return sum + maxOptionValue
  }, 0)
})

// 获取评级
const getGrade = (score: number) => {
  if (!ranges.value || ranges.value.length === 0) {
    return { min: 0, label: '未知', command: '' }
  }
  for (let i = ranges.value.length - 1; i >= 0; i--) {
    const range = ranges.value[i]
    if (range && score >= range.min) {
      return range
    }
  }
  return ranges.value[0]
}

// 当前问题
const currentQuestion = computed(() => {
  return questions.value[currentQuestionIndex.value] || { text: '', options: [] }
})

// 是否是最后一题
const isLastQuestion = computed(() => {
  return currentQuestionIndex.value === questions.value.length - 1
})

const showCourseSelect = ref(false)
const selectedCourse = ref<{
  id: number
  title: string
  description: string | null
  video_url: string | null
  cover_url: string | null
} | null>(null)
const playingVideo = ref(false)
const isMusicPlaying = ref(false)
const audioEl = ref<HTMLAudioElement | null>(null)
const TEST_VIDEO = 'https://xfjs-api.zkyr.net.cn/static/media/vid/9f38419bb0ff4dba.mp4'

const showVideoList = ref(false)
const videos = ref<any[]>([])
const openVideoList = async () => {
  showSurveyThemeSelect.value = false
  showVideoList.value = true
  cas.speak(spks.chooseVideo)
  enterIconUI()
  try {
    const data = await apiJson('vite/api/v1/courses/simple')
    const arr = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? (data as any) : []
    videos.value = arr
  } catch {
    videos.value = []
  }
}
const closeVideoList = () => {
  showVideoList.value = false
  exitIconUI()
}
const listPlayerSrc = ref<string | null>(null)
const showListPlayer = ref(false)
const closeListPlayer = () => {
  showListPlayer.value = false
  if (listPlayerSrc.value && listPlayerSrc.value.startsWith('blob:')) {
    URL.revokeObjectURL(listPlayerSrc.value)
  }
  listPlayerSrc.value = null
  showVideoList.value = true
}
const onListPlayerEnded = async () => {
  showListPlayer.value = false
  if (listPlayerSrc.value && listPlayerSrc.value.startsWith('blob:')) {
    URL.revokeObjectURL(listPlayerSrc.value)
  }
  listPlayerSrc.value = null
  try {
    await recordCourseProgress()
  } catch { }
  showSurveyThemeSelect.value = true
  try {
    await loadSurveys()
  } catch { }
}

const hasModal = computed(() => {
  return (
    showCourseSelect.value ||
    (playingVideo.value && !!selectedCourse.value) ||
    showSurveyThemeSelect.value ||
    showVideoList.value ||
    showListPlayer.value ||
    (showSurvey.value && !showResult.value) ||
    showResult.value
  )
})
const listError = ref<string | null>(null)
let listErrTimer: number | undefined
const notifyListError = (msg: string) => {
  listError.value = msg
  if (listErrTimer) clearTimeout(listErrTimer)
  listErrTimer = window.setTimeout(() => {
    listError.value = null
  }, 3000)
}
const playVideoFromList = (v: any) => {
  const video_url = v?.video_url
  listPlayerSrc.value = String(video_url)
  showVideoList.value = false
  showListPlayer.value = true
  selectedCourse.value = v || null
  cas.speak(spks.videoPlaying)
  enterIconUI()
}
const onListPlayerError = () => {
  notifyListError('视频播放失败，请稍后重试')
  cas.speak(spks.videoError)
  closeListPlayer()
}

const enterIconUI = () => {
  showBegin.value = false
}
const exitIconUI = () => {
  if (!showSurvey.value && !showResult.value && !playingVideo.value && !showVideoList.value && !showListPlayer.value && !showCommandMenu.value) {
    showBegin.value = true
  }
}

const showCommandMenu = ref(false)
const commandList = ref<Array<{ label: string; icon: string; command?: string }>>([
  { label: '柔和模式', icon: '🧡', command: 'soft' },
  { label: '香氛模式3', icon: '🪔', command: 'fragrance3' },
  { label: '香氛模式2', icon: '🪔', command: 'fragrance2' },
  { label: '香氛模式1', icon: '🪔', command: 'fragrance1' },
  { label: '明亮模式', icon: '🌞', command: 'bright' },
  { label: '下课模式', icon: '🧹', command: 'end' },
  { label: '停止香氛', icon: '🧯', command: 'stop' },
])
const openCommandMenu = () => {
  showCommandMenu.value = true
  enterIconUI()
}
const closeCommandMenu = () => {
  showCommandMenu.value = false
  exitIconUI()
}
const execCommand = async (cmd: { label: string; icon: string; command?: string }) => {
  speakCas(cmd.label)
  showCommandMenu.value = false
  exitIconUI()
  try {
    await apiJson('vite/commons/', { method: 'POST', body: { name: cmd.label } })
  } catch (e: any) {
    notifyListError(e?.message || '指令执行失败')
  }
}

const closeSurveyPick = () => {
  showSurveyThemeSelect.value = false
  exitIconUI()
}
const openSurveyPicker = () => {
  showVideoList.value = false
  showSurveyThemeSelect.value = true
  selectedSurveyId.value = null
  cas.speak(spks.chooseSurvey)
  enterIconUI()
  loadSurveys()
}
const startSurveyPick = () => {
  const s = surveys.value.find(x => x.id === selectedSurveyId.value)
  if (s) chooseSurveyTheme(s)
}

const 课程data = [
  {
    id: 11,
    title: 'E2E体验课',
    description: '端到端测试课程',
    video_url: 'https://samplelib.com/lib/preview/mp4/sample-10s.mp4',
    cover_url: 'https://picsum.photos/seed/course11/300/200',
  },
  {
    id: 10,
    title: '测试课程api',
    description: '测试课程api',
    video_url: null,
    cover_url: null,
  },
  {
    id: 9,
    title: '测试课程api',
    description: '测试课程api',
    video_url: null,
    cover_url: null,
  },
  {
    id: 8,
    title: '测试课程',
    description: '课程课程课程课程课程课程',
    video_url: 'http://192.168.2.3/static/media/vid/8a6c552754d74063.mp4',
    cover_url: 'http://192.168.2.3/static/media/img/6b9c879dc6b4429d.png',
  },
  {
    id: 3,
    title: '匹兹堡睡眠',
    description: null,
    video_url: null,
    cover_url: null,
  },
]
// 开始答题
const startSurvey = () => {
  cas.speak(spks.startSurveyTip)
  showBegin.value = false
  showCourseSelect.value = true
  selectedCourse.value = null
  playingVideo.value = false
  showSurvey.value = false
  currentQuestionIndex.value = 0
  userAnswers.value = []
  showResult.value = false
}
const chooseCourse = (course: { id: number; title: string; description: string | null; video_url: string | null; cover_url: string | null }) => {
  if (!course.video_url) return
  selectedCourse.value = course
  showCourseSelect.value = false
  playingVideo.value = true
}


const meUserId = ref<number | null>(null)
const ensureUserId = async () => {
  if (meUserId.value != null) return meUserId.value
  try {
    const me = await apiJson('api/v1/users/me')
    const uid = Number((me as any)?.user_id ?? (me as any)?.data?.user_id)
    meUserId.value = Number.isFinite(uid) ? uid : null
  } catch { }
  return meUserId.value
}
const recordCourseProgress = async () => {
  const courseId = Number((selectedCourse.value as any)?.id)
  if (!courseId) return
  const uid = await ensureUserId()
  const body = { user_id: uid ?? undefined, progress: 100, completed: true, study_minutes: 1 }
  try {
    await apiJson(`api/v1/courses/${courseId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.warn('记录课程进度失败', e)
  }
}

const onVideoEnded = () => {
  playingVideo.value = false
  recordCourseProgress().catch(() => { })
  showSurveyThemeSelect.value = true
  cas.speak(spks.chooseSurvey)
  loadSurveys()
}
const closeVideo = () => {
  playingVideo.value = false
  showSurveyThemeSelect.value = true
  cas.speak(spks.chooseSurvey)
  loadSurveys()
}
const onVideoError = () => {
  playingVideo.value = false
  showCourseSelect.value = true
}
const backToBegin = () => {
  showCourseSelect.value = false
  showBegin.value = true
  selectedCourse.value = null
  playingVideo.value = false
  showSurvey.value = false
}
const stopMusic = () => {
  try {
    if (audioEl.value) {
      audioEl.value.pause()
      audioEl.value.src = ''
    }
  } catch { }
  isMusicPlaying.value = false
}
const startChat = () => {
  showBegin.value = false
}

// 选择答案：记录选中索引与分值
const selectAnswer = (index: number, value: number) => {
  selectedIndex.value[currentQuestionIndex.value] = index
  userAnswers.value[currentQuestionIndex.value] = value
}

const surveys = ref<{ id: number; theme: string }[]>([])
const showSurveyThemeSelect = ref(false)
const selectedSurveyId = ref<number | null>(null)

const loadSurveys = async () => {
  try {
    const data = await apiJson('api/v1/surveys')
    if (Array.isArray(data)) surveys.value = data
  } catch { }
}

const chooseSurveyTheme = async (s: { id: number; theme: string }) => {
  selectedSurveyId.value = s.id
  await fetchSurveyDetail(s.id)
  showSurveyThemeSelect.value = false
  currentQuestionIndex.value = 0
  userAnswers.value = []
  selectedIndex.value = []
  showSurvey.value = true
}

const fetchSurveyDetail = async (surveyId: number) => {
  try {
    const data = await apiJson(`api/v1/surveys/${surveyId}`)
    const detail = data
    if (detail?.questions && detail?.ranges) {
      questions.value = detail.questions
      ranges.value = detail.ranges
    }
  } catch { }
}


const submitSurveyResponses = async () => {
  const sid = Number(selectedSurveyId.value)
  if (!sid || !Array.isArray(questions.value) || !questions.value.length) return
  const answers = questions.value.map((q: any, i: number) => {
    const optIndex = selectedIndex.value[i]
    const opt = (q?.options || [])[optIndex]
    return {
      question_id: Number(q?.id ?? i + 1),
      option_id: Number(opt?.id ?? optIndex),
    }
  }).filter(x => Number.isFinite(x.option_id))
  try {
    await apiJson(`api/v1/surveys/${sid}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
  } catch (e: any) {
    notifyListError(e?.message || '提交答案失败')
  }
}
// 下一题
const nextQuestion = () => {
  if (isLastQuestion.value) {
    submitSurveyResponses().then(() => {
      showResult.value = true
    }).catch(() => {
      showResult.value = true
    })
    try {
      const grade = getGrade(totalScore.value as any)
      const label = (grade as any)?.label || '未知'
      cas.speak(spks.result(label), {
        onEnd: () => {
          setTimeout(() => {
            cas.speak(spks.course)
          }, 400);
        }
      })
    } catch { }
  } else {
    currentQuestionIndex.value++
  }
}

// 上一题
const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

// 重新答题
const restartSurvey = () => {
  currentQuestionIndex.value = 0
  userAnswers.value = []
  selectedIndex.value = []
  showResult.value = false
}
const closeResultModal = () => {
  showResult.value = false
  showSurvey.value = false
  exitIconUI()
  handleJsx()
}

// 处理日常巡检点击
const handleInspectionClick = () => {
  speakCas('欢迎光临')
  showBegin.value = false
}

// 返回首页
const goHome = () => {
  showSurvey.value = false
  showResult.value = false
  showBegin.value = true
}

let cas: NextCas
const speakCas = (
  text: string,
  options?: {
    onStart?: () => void
    onEnd?: () => void
  }
) => {
  cas.speak(text, {
    ...options,
    onStart: () => {
      options?.onStart && options.onStart()
    },
    onEnd: () => {
      options?.onEnd && options.onEnd()
    },
  })
}
let AsrTTS
onMounted(async () => {

  const token = await createAccessToken()

  AsrTTS = new Asr(token, {
    actorId: 'actor_118544',
    model: '16k_zh'
  })
		AsrTTS.on("ready", () => console.log("ASR 准备就绪"));
		AsrTTS.on("sentenceBegin", () => {
			// 停止对话
			// cas.stopAct()
			console.log("ASR 开始识别")
		});
		AsrTTS.on("sentenceEnd", (data) => {
			console.log("一句话识别结束", data);
			if (AsrTTS) {
				cas.stopAct()
				cas.ask(data);
			}
		});

    

  cas = new NextCas(document.getElementById('container')!, {
    token,
    templateName: 'base',
    avatarId: 'avatar_482790',
    actorId: 'actor_118544',
  })

  cas.on('ready', () => {
    simulateClick()
    speakCas(spks.welcome, {
      onStart: () => {
        console.log('start')
        simulateClick()
        showBegin.value = true
      },
      onEnd: () => {
        console.log('end')
      },
    })
  })

  cas.on('reply', data => {
    const { content } = data.data
    console.log('reply', content)

    if (content === replys.请问您是否坐好了.否) {
      handleJsx()
    }

    if (content === replys.请问您是否坐好了.是) {
      cas.speak
        (replys.请问您是否坐好了.是, {
          onEnd() {
            setTimeout(() => {
              cas.ask(asks.fragrance1)
              playFirstMusic()
            }, 200);
          }
        })
    }

  })
})

function handleJsx() {
  setTimeout(() => {
    speakCas('请问您是否坐好了')
  }, 1000 * (location.port === '5174' ? 3 : 30))
}

let record: Record
  ; (async () => {
    record = new Record(await createAccessToken(), 'actor_118544')
  })()

const isListening = ref(false)
const onTouchStart = () => {
  isListening.value = true
  record.start()
}

// Handle touch end
const onTouchEnd = () => {
  record
    .stopToText('16k_zh')
    .then(text => {

      console.log('语音识别结果', text)
      if (!text) return

      const t = String(text).trim().toLowerCase().replace(/[，。！？、,.!\-\s]/g, '')
      const intents = ['体验课程', '体验课', '开始课程', '开始体验课程']
      if (intents.some(k => t.includes(k))) {
        startSurvey()
        return
      }

      if ( ['聊天','对话'].includes(t)) {
        AsrTTS.start();
        return
      }
      cas.ask(text)
    })
    .catch(error => console.error('录音停止时出错:', error))
  isListening.value = false
}

const normalizeUrl = (s: any) => {
  try {
    return String(s ?? '')
      .trim()
      .replace(/[`'\"]/g, '')
  } catch {
    return ''
  }
}
const playFirstMusic = async () => {
  try {
    const data = await apiJson('api/v1/music/')
    const list = data
    const it = Array.isArray(list) ? list[0] : null
    if (!it) return
    const src = normalizeUrl(it?.url)
    if (src && audioEl.value) {
      audioEl.value.src = src
      await audioEl.value.play()
      isMusicPlaying.value = true
    }
  } catch { }
}
const toggleFabMusic = async () => {
  if (isMusicPlaying.value) {
    stopMusic()
  } else {
    await playFirstMusic()
  }
}
const appBgUrl = appBg as any as string
</script>

<template>
  <div class="app-bg" :style="{ backgroundImage: `url(${appBgUrl})` }"></div>
  <div class="page">
    <div class="left">
      <div id="container"></div>
      <div class="ground-shadow" aria-hidden="true"></div>
    </div>

    <div class="right">
      <!-- <transition name="fade-scale"
        ><div v-if="showBegin && !showSurvey && !showResult" class="modal-overlay begin-overlay">
          <div class="begin-modal">
            <div class="begin-title">hi~我是抱抱，芳香教室专属助理，请问您是来</div>
            <div class="begin-actions">
              <el-button type="primary" @click="startSurvey"> 体验课程 </el-button>
              <el-button @click="handleInspectionClick"> 日常巡检 </el-button>
              <el-button @click="startChat"> 进行聊天 </el-button>
            </div>
          </div>
        </div></transition
      > -->

      <transition name="fade-scale">
        <div v-if="showCourseSelect" class="modal-overlay">
          <div class="course-modal">
            <div class="course-modal-header">
              <h2>请选择体验的课程</h2>
              <el-button @click="backToBegin"> 返回上一步 </el-button>
            </div>
            <div class="course-list">
              <div class="course-card" :class="{ disabled: !course.video_url }" v-for="course in 课程data"
                :key="course.id" @click="chooseCourse(course)">
                <div class="cover" v-if="course.cover_url">
                  <img :src="course.cover_url" alt="cover" />
                </div>
                <div class="info">
                  <div class="title">{{ course.title }}</div>
                  <div class="desc">{{ course.description || '暂无描述' }}</div>
                  <div class="tip" v-if="!course.video_url">无视频，暂不可体验</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="playingVideo && selectedCourse" class="modal-overlay" @click.self="closeVideo">
          <div class="video-modal">
            <el-button class="close-circle" @click="closeVideo" aria-label="关闭视频" title="关闭"> × </el-button>
            <video :key="selectedCourse.id" :src="selectedCourse.video_url!" controls autoplay muted playsinline
              preload="metadata" @ended="onVideoEnded" @error="onVideoError"></video>
          </div>
        </div>
      </transition>

      <audio ref="audioEl" style="display: none" @ended="isMusicPlaying = false"
        @error="isMusicPlaying = false"></audio>

      <transition name="fade-scale">
        <div v-if="showSurveyThemeSelect" class="modal-overlay top-overlay survey-overlay"
          @click.self="closeSurveyPick">
          <div class="survey-dialog">
            <div class="dialog-header">
              <h3>测评</h3>
              <el-button class="close-circle" @click="closeSurveyPick" aria-label="关闭" title="关闭">×</el-button>
            </div>
            <p class="dialog-tip">请在下列表中选择您想要的测评方案</p>
            <div class="dialog-list">
              <button class="dialog-item" :class="{ selected: selectedSurveyId === s.id }" v-for="s in surveys"
                :key="s.id" @click="selectedSurveyId = s.id">
                <span class="item-text">{{ s.theme || '未命名问卷' }}</span>
              </button>
            </div>
            <div class="dialog-actions">
              <el-button type="primary" :disabled="!selectedSurveyId" @click="startSurveyPick">开始测评</el-button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showSurvey && !showResult" class="modal-overlay">
          <div class="survey-container">
            <div class="survey-header">
              <h2>问卷答题</h2>
              <div class="header-right">
                <div class="progress">题目 {{ currentQuestionIndex + 1 }} / {{ questions.length }}</div>
                <el-button class="close-circle" @click="goHome" aria-label="关闭" title="关闭">×</el-button>
              </div>
            </div>

            <div class="question-card">
              <h3>{{ currentQuestion.text }}</h3>

              <div class="options">
                <div v-for="(option, index) in currentQuestion.options" :key="index" class="option" :class="{
                  selected: selectedIndex[currentQuestionIndex] === index,
                }" @click="selectAnswer(index, option.value)">
                  <span class="option-label">{{ String.fromCharCode(65 + index) }}</span>
                  <span class="option-text">{{ option.text }}</span>
                  <span class="option-value">{{ option.value }}分</span>
                </div>
              </div>

              <div class="navigation">
                <el-button @click="prevQuestion" :disabled="currentQuestionIndex === 0">上一题</el-button>

                <el-button type="primary" @click="nextQuestion"
                  :disabled="selectedIndex[currentQuestionIndex] === undefined">{{
                    isLastQuestion ? '提交' : '下一题'
                  }}</el-button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade-scale">
        <div v-if="showResult" class="result-container">
          <div class="result-card">
            <div class="result-summary">
              <span class="result-prefix">根据您的情况</span>
              <span class="grade-badge">{{ getGrade(totalScore)?.label || '' }}</span>
            </div>
            <div class="result-actions">
              <el-button type="primary" @click="restartSurvey"> 重新评测 </el-button>
              <el-button type="primary" @click="closeResultModal">继续</el-button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
  <el-button class="voice-button" :class="{ listening: isListening }" @mousedown="onTouchStart" @mouseup="onTouchEnd"
    @mouseleave="onTouchEnd" @touchstart.prevent="onTouchStart" @touchend.prevent="onTouchEnd" aria-label="按住说话">
    <span class="voice-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26">
        <rect x="9" y="4" width="6" height="10" rx="3" fill="currentColor" />
        <path d="M5 11a7 7 0 0014 0" fill="none" stroke="currentColor" stroke-width="1.6" />
        <path d="M12 18v3" fill="none" stroke="currentColor" stroke-width="1.6" />
        <path d="M8 21h8" fill="none" stroke="currentColor" stroke-width="1.6" />
      </svg>
    </span>
  </el-button>
  <transition name="fade-out">
    <div v-show="!hasModal" class="left-fab">
      <button class="fab-btn" title="课程列表" @click="openVideoList">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <rect x="5" y="7" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path d="M10 9l6 3-6 3V9" fill="currentColor" />
        </svg>
      </button>
      <button class="fab-btn" title="命令模式" @click="openCommandMenu">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path d="M7 10l3 2-3 2" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path d="M12 14h5" fill="none" stroke="currentColor" stroke-width="1.6" />
        </svg>
      </button>

      <button class="fab-btn" :title="isMusicPlaying ? '停止音乐' : '播放音乐'" @click="toggleFabMusic">
        <svg v-if="!isMusicPlaying" viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path d="M10 8l6 4-6 4V8" fill="currentColor" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6" />
          <rect x="8" y="7" width="3" height="10" fill="currentColor" />
          <rect x="13" y="7" width="3" height="10" fill="currentColor" />
        </svg>
      </button>
      <button class="fab-btn" title="测评选择" @click="openSurveyPicker">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <rect x="6" y="5" width="12" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path d="M9 9h6" stroke="currentColor" stroke-width="1.6" />
          <path d="M9 13h6" stroke="currentColor" stroke-width="1.6" />
          <path d="M9 17h6" stroke="currentColor" stroke-width="1.6" />
        </svg>
      </button>
    </div>
  </transition>
  <transition name="fade-scale">
    <div v-if="showVideoList" class="modal-overlay top-overlay" @click.self="closeVideoList">
      <div class="video-list-modal">
        <div class="video-list-header">
          <h2>课程列表</h2>
          <el-button class="close-circle" @click="closeVideoList" aria-label="关闭" title="关闭">×</el-button>
        </div>
        <div class="video-grid">
          <div class="video-item" v-for="v in videos" :key="v.id" @click="playVideoFromList(v)">
            <div class="thumb">
              <img :src="v.i_url || v.cover_url || ''" alt="thumbnail" />
            </div>
            <div class="meta">
              <div class="name">{{ v.name || v.title || '未命名' }}</div>
              <div class="desc">{{ v.description || '' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
  <transition name="fade-scale">
    <div v-if="showCommandMenu" class="cmd-overlay" @click.self="closeCommandMenu">
      <div class="cmd-menu">
        <div class="cmd-item" v-for="(c, i) in commandList" :key="i" @click="execCommand(c)">
          <span class="cmd-icon">{{ c.icon }}</span>
          <span class="cmd-label">{{ c.label }}</span>
        </div>
      </div>
    </div>
  </transition>
  <div v-if="listError" class="banner" role="alert" @click="listError = null">
    {{ listError }}
  </div>
  <transition name="fade-scale">
    <div v-if="showListPlayer && listPlayerSrc" class="modal-overlay" @click.self="closeListPlayer">
      <div class="video-modal">
        <el-button class="close-circle" @click="closeListPlayer" aria-label="关闭视频" title="关闭">×</el-button>
        <video :src="listPlayerSrc!" controls autoplay playsinline preload="metadata" @ended="onListPlayerEnded"
          @error="onListPlayerError"></video>
      </div>
    </div>
  </transition>
</template>

<style scoped>
#container {
  width: 100%;
  height: min(60vh, calc(var(--leftWidth) * 1.1));
}

.page {
  display: grid;
  grid-template-columns: var(--leftWidth) 1fr;
  gap: clamp(16px, 4vw, 32px);
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
  align-items: center;
  justify-content: center;
  --leftWidth: 340px;
}

.left {
  width: var(--leftWidth);
  position: relative;
  min-height: 72vh;
}

.right {
  position: relative;
  min-width: clamp(560px, 48vw, 980px);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}

#container {
  position: fixed;
  left: 15%;
  bottom: 15%;
  width: 500px;
  height: clamp(46vh, 56vh, 64vh);
  z-index: 1;
}

.ground-shadow {
  position: fixed;
  left: 26px;
  bottom: 14px;
  width: clamp(220px, 20vw, 320px);
  height: 18px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.22) 0%, rgba(0, 0, 0, 0.12) 42%, rgba(0, 0, 0, 0) 72%);
  border-radius: 9999px;
  pointer-events: none;
  z-index: 0;
}

.begin span {
  cursor: pointer;
  color: blue;
  border: 1px solid blue;
  border-radius: 5px;
  padding: 2px;
}

.begin-modal {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.12);
  padding: 32px;
  max-width: 640px;
  width: 100%;
  text-align: center;
}

.begin-title {
  color: #111827;
  margin-bottom: 20px;
  font-size: 22px;
  line-height: 1.6;
  font-weight: 600;
}

.begin-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.begin-actions :deep(.el-button) {
  padding: 12px 18px;
  border-radius: 10px;
  min-width: 140px;
}

.begin-actions :deep(.el-button--primary) {
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.35);
}

.course-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 24px;
  max-width: 900px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.course-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.course-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-top: 12px;
  flex: 1;
  overflow: auto;
  padding-right: 6px;
}

.survey-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  flex: 1;
  overflow: auto;
  padding-right: 6px;
}

.survey-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
}

.survey-item:hover {
  border-color: #3b82f6;
  background: #f8f9ff;
}

.survey-title {
  font-weight: 600;
}

.course-card {
  display: flex;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.course-card:hover {
  border-color: #3b82f6;
  background: #f8f9ff;
}

.course-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.course-card .cover img {
  width: 100px;
  height: 70px;
  object-fit: cover;
  border-radius: 6px;
}

.course-card .info .title {
  font-weight: 600;
}

.course-card .info .desc {
  font-size: 12px;
  color: #666;
}

.course-card .info .tip {
  font-size: 12px;
  color: #ef4444;
}

.video-modal {
  background: #000;
  border-radius: 12px;
  padding: 12px;
  max-width: 1000px;
  width: clamp(560px, 60vw, 1000px);
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

.video-modal .close-circle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
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

.video-close:focus {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.video-close:active {
  transform: scale(0.98);
}

.audio-bar {}

.audio-bar audio {}

.modal-close {
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

.modal-close:hover {
  background: rgba(0, 0, 0, 0.75);
  transform: scale(1.05);
}

.top-overlay {
  align-items: flex-start;
  padding-top: 12px;
}

.survey-overlay {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: saturate(130%) blur(1.5px);
  -webkit-backdrop-filter: saturate(130%) blur(1.5px);
}

.picker-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1400;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: saturate(130%) blur(1.5px);
}

.survey-dialog {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 36px rgba(17, 24, 39, 0.18);
  padding: 24px;
  width: clamp(560px, 38vw, 720px);
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0 auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-tip {
  margin: 8px 0 12px;
  color: #64748b;
}

.dialog-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  flex: 1;
  overflow: auto;
  padding-right: 6px;
}

.dialog-list {
  scrollbar-width: thin;
  scrollbar-color: #a5b4fc rgba(241, 245, 249, 0.5);
}

.dialog-list::-webkit-scrollbar {
  width: 10px;
}

.dialog-list::-webkit-scrollbar-track {
  background: transparent;
}

.dialog-list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(99, 102, 241, .35), rgba(147, 197, 253, .35));
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, .5);
}

.dialog-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(99, 102, 241, .55), rgba(147, 197, 253, .55));
}

.dialog-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
}

.dialog-item:hover {
  border-color: #3b82f6;
  background: #f0f6ff;
}

.dialog-item.selected {
  border-color: #3b82f6;
  background: #eef2ff;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

/* 答题界面样式 */
.survey-container {
  width: clamp(520px, 36vw, 680px);
  margin: 32px auto;
  padding: 24px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  max-height: 72vh;
  overflow: auto;
}

.survey-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.survey-header h2 {
  margin: 0;
  color: #333;
}

.progress {
  font-size: 14px;
  color: #666;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-btn {
  --el-button-bg-color: #fef2f2;
  --el-button-text-color: #b91c1c;
  --el-button-hover-bg-color: #fee2e2;
  --el-button-hover-text-color: #7f1d1d;
  --el-button-border-color: #fecaca;
  --el-button-hover-border-color: #fca5a5;
  width: 36px;
  height: 36px;
  aspect-ratio: 1 / 1;
  padding: 15px !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.close-btn:focus-visible {
  outline: 2px solid #ef4444;
  outline-offset: 2px;
}

.close-btn:active {
  transform: scale(0.96);
}

.question-card {
  padding: 20px 0;
}

.question-card h3 {
  margin: 0 0 22px 0;
  font-size: 22px;
  color: #111827;
}

.options {
  margin-bottom: 30px;
}

.option {
  display: flex;
  align-items: center;
  padding: 18px;
  margin-bottom: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.option:hover {
  border-color: #3b82f6;
  background-color: #f8f9ff;
}

.option.selected {
  border-color: #3b82f6;
  background-color: #eef2ff;
}

.option-label {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #333;
  background: #f0f0f0;
  border-radius: 50%;
  margin-right: 16px;
}

.option.selected .option-label {
  background: #3b82f6;
  color: white;
}

.option-text {
  flex: 1;
  font-size: 16px;
}

.option-value {
  font-size: 14px;
  color: #666;
}

.navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.survey-container :deep(.el-button) {
  padding: 12px 22px;
  font-size: 16px;
}

/* 结果界面样式 */
.result-container {
  width: clamp(520px, 36vw, 680px);
  margin: 24px auto;
  padding: 20px;
}

.result-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 30px;
  text-align: center;
}

.result-card h2 {
  margin-top: 0;
  color: #333;
}

.score-display {
  margin: 30px 0;
}

.score-circle {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #f0f9ff;
  border: 4px solid #3b82f6;
  margin-bottom: 15px;
}

.score-value {
  font-size: 36px;
  font-weight: bold;
  color: #3b82f6;
}

.score-max {
  font-size: 16px;
  color: #666;
}

.grade {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.answer-summary {
  text-align: left;
  margin: 30px 0;
}

.answer-summary h3 {
  margin-bottom: 15px;
  color: #333;
}

.answer-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.question-text {
  flex: 1;
}

.answer-value {
  font-weight: bold;
  color: #3b82f6;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 30px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1400;
  background: rgba(255, 255, 255, 0.08);
}

.begin-overlay {
  align-items: flex-start;
  padding-top: clamp(80px, 18vh, 200px);
}

.result-summary {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  flex-wrap: nowrap;
}

.result-prefix {
  color: #64748b;
  font-size: 18px;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.grade-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  min-width: 96px;
  background: #f3f4f6;
  color: #111827;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
}

.voice-button {
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 1100;
  background: linear-gradient(#ffffffcc, #ffffffcc) padding-box,
    linear-gradient(180deg, rgba(167, 139, 250, 0.9), rgba(96, 165, 250, 0.9)) border-box;
  color: var(--primary);
  border: 2px solid transparent;
  border-radius: 9999px;
  width: 100px;
  height: 100px;
  padding: 0;
  box-shadow: 0 10px 26px rgba(124, 58, 237, 0.22);
  cursor: pointer;
  overflow: visible;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: fixed;
}

.voice-button:hover {
  box-shadow: 0 12px 30px rgba(124, 58, 237, 0.3);
  transform: translateX(-50%) scale(1.02);
}

.voice-button:active {
  transform: translateX(-50%) scale(0.98);
}

.voice-icon svg {
  color: #1f2937;
}

.voice-button::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 9999px;
  background: radial-gradient(closest-side, rgba(124, 58, 237, 0.18), rgba(124, 58, 237, 0) 70%);
  z-index: -1;
}

.voice-button:active {
  transform: translateX(-50%) scale(0.98);
}

.voice-button.listening::after,
.voice-button.listening::before {
  content: '';
  position: absolute;
  inset: -6px;
  border: 2px solid #93c5fd;
  border-radius: 9999px;
  pointer-events: none;
  animation: ripple 1.6s ease-out infinite;
}

.voice-button.listening::before {
  animation-delay: 0.6s;
  opacity: 0.6;
}

@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }

  100% {
    transform: scale(1.7);
    opacity: 0;
  }
}

.voice-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease, filter 0.18s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(8px);
  filter: blur(1px);
}

.fade-down-enter-active,
.fade-down-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-out-enter-active,
.fade-out-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-out-enter-from,
.fade-out-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.cmd-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 96px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: saturate(130%) blur(1.5px);
}

.cmd-menu {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: saturate(180%) blur(10px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  box-shadow: 0 16px 36px rgba(17, 24, 39, 0.18);
  width: clamp(220px, 24vw, 300px);
  overflow: hidden;
}

.cmd-item {
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
  cursor: pointer;
}

.cmd-item:last-child {
  border-bottom: none;
}

.cmd-item:hover {
  background: #f8fafc;
}

.cmd-icon {
  font-size: 18px;
  line-height: 1;
  text-align: center;
}

.cmd-label {
  font-weight: 600;
  color: #111827;
}

.app-bg {
  position: fixed;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.page,
.left-fab,
.banner {
  position: relative;
  z-index: 1;
}

.banner {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #ef4444;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  z-index: 1200;
}

.left-fab {
  position: fixed;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 1501;
}

.fab-btn {
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 10px 24px rgba(124, 58, 237, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  backdrop-filter: saturate(160%) blur(2px);
}

.fab-btn svg {
  width: 26px;
  height: 26px;
}

.fab-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(124, 58, 237, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.3);
  filter: brightness(1.05);
}

.fab-btn:active {
  transform: translateY(0);
  filter: brightness(0.95);
}

.video-list-modal {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: saturate(180%) blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 16px 36px rgba(17, 24, 39, 0.18);
  width: clamp(560px, 64vw, 980px);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 18px;
  overflow: hidden;
}

.video-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.video-list-header h2 {
  margin: 0;
  font-weight: 700;
  color: #111827;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 50px;
  flex: 1;
  padding: 18px;
  overflow: auto;
  padding-right: 6px;
}

.video-grid {
  scrollbar-width: thin;
  scrollbar-color: #a5b4fc rgba(241, 245, 249, 0.5);
}

.video-grid::-webkit-scrollbar {
  width: 10px;
}

.video-grid::-webkit-scrollbar-track {
  background: transparent;
}

.video-grid::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(99, 102, 241, .35), rgba(147, 197, 253, .35));
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, .5);
}

.video-grid::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(99, 102, 241, .55), rgba(147, 197, 253, .55));
}

.video-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  min-height: 240px;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.video-item:nth-child(2n) {
  transform: translateY(50%);
}

.video-item:hover {
  border-color: #a78bfa;
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.15);
}

.video-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.video-item .thumb {
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
}

.video-item .thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-item .meta {
  padding: 12px;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.video-item .name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-item .desc {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 480px) {
  .result-summary {
    gap: 8px;
    padding: 10px 12px;
  }

  .result-prefix,
  .grade-badge {
    font-size: 16px;
  }
}

@media (max-width: 960px) {
  .page {
    grid-template-columns: 1fr;
    gap: 12px;
    align-items: center;
    justify-content: center;
    --leftWidth: 300px;
  }

  .left {
    width: var(--leftWidth);
    position: static;
    min-height: auto;
  }

  #container {
    position: fixed;
    left: 15%;
    bottom: 15%;
    width: 500px;
    height: clamp(40vh, 48vh, 56vh);
  }

  .ground-shadow {
    position: fixed;
    left: 18px;
    bottom: 10px;
    width: clamp(200px, 36vw, 260px);
    display: block;
  }
}

.right {
  min-width: auto;
  width: 100%;
  min-height: auto;
  align-items: flex-start;
  padding-top: clamp(24px, 10vh, 80px);
}

.result-container {
  width: clamp(520px, 36vw, 640px);
  margin: 0 auto;
}

.modal-overlay {
  align-items: flex-start;
}

.survey-overlay {
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: saturate(160%) blur(6px);
  -webkit-backdrop-filter: saturate(160%) blur(6px);
}
</style>
