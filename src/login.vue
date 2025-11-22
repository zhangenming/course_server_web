<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { apiJson } from '@/utils/request'
import { apiFetch } from '@/utils/request'
import { ElIcon } from 'element-plus'
import { User, Lock, View, Hide, Warning, CircleCheck } from '@element-plus/icons-vue'

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const bannerType = ref<'success' | 'error'>('error')
const rememberMe = ref(false)
const usernameError = ref('')
const passwordError = ref('')

const activeAuth = ref<'admin' | 'student'>('admin')
const studentTab = ref<'login' | 'register'>('login')
const maskPhone = (s: string) => {
  const v = String(s || '')
  if (v.length < 7) return v
  return v.slice(0, 3) + '****' + v.slice(-4)
}

const studentPhone = ref('')
const studentUsername = ref('')
const studentPhoneError = ref('')
const studentUsernameError = ref('')
const studentLoginLoading = ref(false)
const loginMode = ref<'phone' | 'username'>('phone')

// 监听登录模式切换，清空另一种输入
watch(loginMode, (newMode: 'phone' | 'username') => {
  if (newMode === 'phone') {
    studentUsername.value = ''
    studentUsernameError.value = ''
  } else {
    studentPhone.value = ''
    studentPhoneError.value = ''
  }
})
const validateStudentPhone = () => {
  const p = studentPhone.value.trim()
  if (!p) {
    studentPhoneError.value = '请输入手机号'
    return false
  }
  const ok = /^1[3-9]\d{9}$/.test(p)
  if (!ok) {
    studentPhoneError.value = '手机号格式不正确'
    return false
  }
  studentPhoneError.value = ''
  return true
}

const validateStudentUsername = () => {
  const u = studentUsername.value.trim()
  if (!u) {
    studentUsernameError.value = '请输入用户名'
    return false
  }
  if (u.length < 3 || u.length > 50) {
    studentUsernameError.value = '用户名长度为3-50'
    return false
  }
  studentUsernameError.value = ''
  return true
}
const isStudentLoginValid = computed(() => {
  if (loginMode.value === 'phone') {
    return /^1[3-9]\d{9}$/.test(studentPhone.value.trim())
  } else {
    const u = studentUsername.value.trim()
    return u.length >= 3 && u.length <= 50
  }
})

const submitStudentLogin = async () => {
  if (studentLoginLoading.value) return

  let ok = false
  if (loginMode.value === 'phone') {
    ok = validateStudentPhone()
  } else {
    ok = validateStudentUsername()
  }

  if (!ok) return
  studentLoginLoading.value = true
  try {
    const data = await apiJson('commons/login_alt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: loginMode.value === 'username' ? studentUsername.value.trim() : null,
        phone: loginMode.value === 'phone' ? studentPhone.value.trim() : null,
      }),
    })
    const token = (data as any)?.token || (data as any)?.data?.token
    if (token) {
      ;(window as any).token = token
      localStorage.token = token
      setTimeout(() => {
        location.reload()
      }, 500)
    } else {
      const msg = (data as any)?.messgae || (data as any)?.message
      notify(msg || '登录失败')
    }
  } catch (e: any) {
    notify(e?.message || '网络错误')
  } finally {
    studentLoginLoading.value = false
  }
}

const regUsername = ref('')
const regName = ref('')
const regRole = ref('student')
const regGender = ref<'男' | '女'>('男')
const regPhone = ref('')
const regPassword = ref('admin123')
const regUsernameError = ref('')
const regNameError = ref('')
const regRoleError = ref('')
const regGenderError = ref('')
const regPhoneError = ref('')
const studentRegisterLoading = ref(false)
const validateRegUsername = () => {
  const u = regUsername.value.trim()
  if (!u) {
    regUsernameError.value = '请输入用户名'
    return false
  }
  if (u.length < 3 || u.length > 50) {
    regUsernameError.value = '用户名长度为3-50'
    return false
  }
  regUsernameError.value = ''
  return true
}
const validateRegName = () => {
  const n = regName.value.trim()
  if (!n) {
    regNameError.value = '请输入姓名'
    return false
  }
  if (n.length < 2 || n.length > 20) {
    regNameError.value = '姓名长度为2-20'
    return false
  }
  regNameError.value = ''
  return true
}
const validateRegRole = () => {
  const r = String(regRole.value || '')
  if (!r) {
    regRoleError.value = '请选择角色'
    return false
  }
  regRoleError.value = ''
  return true
}
const validateRegGender = () => {
  const g = String(regGender.value || '')
  if (!g) {
    regGenderError.value = '请选择性别'
    return false
  }
  regGenderError.value = ''
  return true
}
const validateRegPhone = () => {
  const p = regPhone.value.trim()
  if (!p) {
    regPhoneError.value = '请输入手机号'
    return false
  }
  if (!/^1[3-9]\d{9}$/.test(p)) {
    regPhoneError.value = '手机号格式不正确'
    return false
  }
  regPhoneError.value = ''
  return true
}
const isRegisterValid = computed(() => {
  const u = regUsername.value.trim()
  const n = regName.value.trim()
  const p = regPhone.value.trim()
  return u.length >= 3 && u.length <= 50 && n.length >= 2 && n.length <= 20 && /^1[3-9]\d{9}$/.test(p) && !!regRole.value && !!regGender.value
})

const roleDialogVisible = ref(false)
const openRoleDialog = () => {
  roleDialogVisible.value = true
}
const selectRole = (val: 'student' | 'teacher') => {
  regRole.value = val
  roleDialogVisible.value = false
  validateRegRole()
}
const submitStudentRegister = async () => {
  if (studentRegisterLoading.value) return
  const a = validateRegUsername()
  const a2 = validateRegName()
  const b = validateRegRole()
  const c = validateRegGender()
  const d = validateRegPhone()
  if (!(a && a2 && b && c && d)) return
  studentRegisterLoading.value = true
  try {
    const body = JSON.stringify({
      username: regUsername.value.trim(),
      name: regName.value.trim(),
      password: regPassword.value,
      role: regRole.value,
      gender: regGender.value,
      phone: regPhone.value.trim(),
    })
    const data = await apiJson('api/v1/users/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    notify('注册成功：' + maskPhone(regPhone.value.trim()), 'success')
    studentTab.value = 'login'
    studentPhone.value = regPhone.value.trim()
  } catch (e: any) {
    notify(e?.message || '网络错误')
  } finally {
    studentRegisterLoading.value = false
  }
}

let hideTimer: number | undefined

const notify = (msg: string, type: 'success' | 'error' = 'error') => {
  bannerType.value = type
  error.value = msg
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => {
    error.value = null
  }, 3000)
}

const validateUsername = () => {
  if (!username.value.trim()) {
    usernameError.value = '请输入用户名'
    return false
  }
  usernameError.value = ''
  return true
}

const validatePassword = () => {
  if (!password.value) {
    passwordError.value = '请输入密码'
    return false
  }
  if (password.value.length < 6) {
    passwordError.value = '密码长度至少6位'
    return false
  }
  passwordError.value = ''
  return true
}

const isFormValid = computed(() => {
  return username.value.trim() && password.value.length >= 6
})

const submit = async () => {
  if (loading.value) return

  const isUsernameValid = validateUsername()
  const isPasswordValid = validatePassword()

  if (!isUsernameValid || !isPasswordValid) {
    return
  }

  loading.value = true
  error.value = null

  try {
    const data = await apiJson('commons/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value,
        role: 'admin',
        rememberMe: rememberMe.value,
      }),
    })
    const token = (data as any)?.token || (data as any)?.data?.token
    if (token) {
      if (rememberMe.value) {
        localStorage.setItem('rememberedUsername', username.value)
      } else {
        localStorage.removeItem('rememberedUsername')
      }
      ;(window as any).token = token
      localStorage.token = token

      setTimeout(() => {
        location.reload()
      }, 500)
    } else {
      const msg = (data as any)?.messgae || (data as any)?.message
      notify(msg || '用户名或密码错误')
    }
  } catch (e: any) {
    notify(e?.message || '网络错误')
  } finally {
    loading.value = false
  }
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const handleEnter = (field: 'username' | 'password') => {
  if (field === 'username') {
    validateUsername()
    const passwordInput = document.querySelector('input[type="password"], input[type="text"]') as HTMLInputElement
    passwordInput?.focus()
  } else {
    validatePassword()
    if (isFormValid.value) {
      submit()
    }
  }
}

const forgotPassword = () => {
  notify('请联系管理员重置密码')
}

const socialLogin = (provider: string) => {
  notify(`${provider}登录功能开发中`)
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <div v-if="error" class="banner" :class="bannerType" role="alert" @click="error = null">
        <el-icon><Warning /></el-icon>
        {{ error }}
      </div>

      <div class="login-card">
        <div class="auth-switch">
          <button type="button" class="switch-btn" :class="{ active: activeAuth === 'admin' }" @click="activeAuth = 'admin'">管理员登录</button>
          <button type="button" class="switch-btn" :class="{ active: activeAuth === 'student' }" @click="activeAuth = 'student'">
            学员登录/注册
          </button>
        </div>
        <div class="card-header">
          <div class="logo">
            <img src="/src/assets/logomini.png" alt="Logo" class="logo-image" />
          </div>
          <h1 class="card-title">欢迎回来</h1>
          <p class="card-subtitle" v-if="activeAuth === 'admin'">请登录您的管理员账户</p>
          <p class="card-subtitle" v-else>请选择学员登录或注册</p>
        </div>

        <form v-if="activeAuth === 'admin'" class="login-form" @submit.prevent="submit">
          <div class="form-group" :class="{ 'has-error': usernameError }">
            <label for="username" class="form-label">
              <el-icon><User /></el-icon>
              用户名
            </label>
            <div class="input-wrapper">
              <input
                id="username"
                v-model="username"
                type="text"
                class="form-input"
                placeholder="请输入用户名"
                :class="{ 'input-error': usernameError }"
                @blur="validateUsername"
                @keyup.enter="handleEnter('username')"
                autocomplete="username"
              />
              <div v-if="username && !usernameError" class="input-icon success">
                <el-icon><CircleCheck /></el-icon>
              </div>
            </div>
            <div v-if="usernameError" class="error-message">
              <el-icon><Warning /></el-icon>
              {{ usernameError }}
            </div>
          </div>

          <div class="form-group" :class="{ 'has-error': passwordError }">
            <label for="password" class="form-label">
              <el-icon><Lock /></el-icon>
              密码
            </label>
            <div class="input-wrapper">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="请输入密码"
                :class="{ 'input-error': passwordError }"
                @blur="validatePassword"
                @keyup.enter="handleEnter('password')"
                autocomplete="current-password"
              />
              <button type="button" class="password-toggle" @click="togglePasswordVisibility" :aria-label="showPassword ? '隐藏密码' : '显示密码'">
                <el-icon>
                  <View v-if="!showPassword" />
                  <Hide v-else />
                </el-icon>
              </button>
            </div>
            <div v-if="passwordError" class="error-message">
              <el-icon><Warning /></el-icon>
              {{ passwordError }}
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-wrapper">
              <input v-model="rememberMe" type="checkbox" class="checkbox-input" />
              <span class="checkbox-label">记住登录状态</span>
            </label>
            <button type="button" class="link-button" @click="forgotPassword">忘记密码？</button>
          </div>

          <button type="submit" class="submit-button" :disabled="loading || !isFormValid" :class="{ loading: loading }">
            <span v-if="!loading">登录</span>
            <span v-else class="loading-text">
              <span class="spinner"></span>
              登录中...
            </span>
          </button>
        </form>

        <div v-else class="login-form">
          <div class="sub-switch">
            <button type="button" class="switch-btn" :class="{ active: studentTab === 'login' }" @click="studentTab = 'login'">登录</button>
            <button type="button" class="switch-btn" :class="{ active: studentTab === 'register' }" @click="studentTab = 'register'">注册</button>
          </div>

          <div v-if="studentTab === 'login'">
            <div class="login-mode-switch">
              <button type="button" class="mode-button" :class="{ active: loginMode === 'phone' }" @click="loginMode = 'phone'">手机号登录</button>
              <button type="button" class="mode-button" :class="{ active: loginMode === 'username' }" @click="loginMode = 'username'">
                用户名登录
              </button>
            </div>

            <div v-if="loginMode === 'phone'" class="form-group" :class="{ 'has-error': studentPhoneError }">
              <label for="student-phone" class="form-label">
                <el-icon><User /></el-icon>
                手机号
              </label>
              <div class="input-wrapper">
                <input
                  id="student-phone"
                  v-model="studentPhone"
                  type="tel"
                  inputmode="numeric"
                  class="form-input"
                  placeholder="请输入手机号"
                  :class="{ 'input-error': studentPhoneError }"
                  @blur="validateStudentPhone"
                  @keyup.enter="isStudentLoginValid && submitStudentLogin()"
                  autocomplete="tel"
                />
                <div v-if="studentPhone && !studentPhoneError" class="input-icon success">
                  <el-icon><CircleCheck /></el-icon>
                </div>
              </div>
              <div v-if="studentPhoneError" class="error-message">
                <el-icon><Warning /></el-icon>
                {{ studentPhoneError }}
              </div>
            </div>

            <div v-else class="form-group" :class="{ 'has-error': studentUsernameError }">
              <label for="student-username" class="form-label">
                <el-icon><User /></el-icon>
                用户名
              </label>
              <div class="input-wrapper">
                <input
                  id="student-username"
                  v-model="studentUsername"
                  type="text"
                  class="form-input"
                  placeholder="请输入用户名"
                  :class="{ 'input-error': studentUsernameError }"
                  @blur="validateStudentUsername"
                  @keyup.enter="isStudentLoginValid && submitStudentLogin()"
                  autocomplete="username"
                />
                <div v-if="studentUsername && !studentUsernameError" class="input-icon success">
                  <el-icon><CircleCheck /></el-icon>
                </div>
              </div>
              <div v-if="studentUsernameError" class="error-message">
                <el-icon><Warning /></el-icon>
                {{ studentUsernameError }}
              </div>
            </div>

            <button
              type="button"
              class="submit-button"
              :disabled="studentLoginLoading || !isStudentLoginValid"
              :class="{ loading: studentLoginLoading }"
              @click="submitStudentLogin"
            >
              <span v-if="!studentLoginLoading">学员登录</span>
              <span v-else class="loading-text">
                <span class="spinner"></span>
                登录中...
              </span>
            </button>
          </div>

          <div v-else>
            <div class="register-grid">
              <div class="form-group" :class="{ 'has-error': regUsernameError }">
                <label for="reg-username" class="form-label">
                  <el-icon><User /></el-icon>
                  用户名
                </label>
                <div class="input-wrapper">
                  <input
                    id="reg-username"
                    v-model="regUsername"
                    type="text"
                    class="form-input"
                    placeholder="请输入用户名（3-50）"
                    :class="{ 'input-error': regUsernameError }"
                    @blur="validateRegUsername"
                    autocomplete="username"
                  />
                </div>
                <div v-if="regUsernameError" class="error-message">
                  <el-icon><Warning /></el-icon>
                  {{ regUsernameError }}
                </div>
              </div>

              <div class="form-group" :class="{ 'has-error': regNameError }">
                <label for="reg-name" class="form-label">
                  <el-icon><User /></el-icon>
                  姓名
                </label>
                <div class="input-wrapper">
                  <input
                    id="reg-name"
                    v-model="regName"
                    type="text"
                    class="form-input"
                    placeholder="请输入姓名（2-20）"
                    :class="{ 'input-error': regNameError }"
                    @blur="validateRegName"
                    autocomplete="name"
                  />
                </div>
                <div v-if="regNameError" class="error-message">
                  <el-icon><Warning /></el-icon>
                  {{ regNameError }}
                </div>
              </div>

              <div class="form-group">
                <label for="reg-password" class="form-label">
                  <el-icon><Lock /></el-icon>
                  密码（固定）
                </label>
                <div class="input-wrapper">
                  <input id="reg-password" v-model="regPassword" type="password" class="form-input" disabled />
                </div>
              </div>

              <div class="form-group" :class="{ 'has-error': regRoleError }">
                <label class="form-label">角色</label>
                <div class="input-wrapper">
                  <button
                    type="button"
                    class="form-input role-display"
                    @click="openRoleDialog"
                    aria-haspopup="dialog"
                    :aria-label="'当前角色：' + (regRole === 'student' ? '学生' : '老师')"
                  >
                    <span class="role-text">{{ regRole === 'student' ? '学生' : '老师' }}</span>
                    <span class="role-arrow" aria-hidden="true"></span>
                  </button>
                </div>
                <div v-if="regRoleError" class="error-message">
                  <el-icon><Warning /></el-icon>
                  {{ regRoleError }}
                </div>

                <el-dialog v-model="roleDialogVisible" title="选择角色" width="360px" :close-on-click-modal="true" :close-on-press-escape="true">
                  <div class="role-grid">
                    <button type="button" class="role-card" :class="{ active: regRole === 'student' }" @click="selectRole('student')">
                      <span class="role-card-title">学生</span>
                      <span class="role-card-desc">用于学员登录与学习记录</span>
                    </button>
                    <button type="button" class="role-card" :class="{ active: regRole === 'teacher' }" @click="selectRole('teacher')">
                      <span class="role-card-title">老师</span>
                      <span class="role-card-desc">用于教师登录与教学管理</span>
                    </button>
                  </div>
                  <template #footer>
                    <el-button @click="roleDialogVisible = false">取消</el-button>
                  </template>
                </el-dialog>
              </div>

              <div class="form-group" :class="{ 'has-error': regGenderError }">
                <label class="form-label">性别</label>
                <div class="gender-row">
                  <label class="radio">
                    <input type="radio" value="男" v-model="regGender" @change="validateRegGender" />
                    男
                  </label>
                  <label class="radio">
                    <input type="radio" value="女" v-model="regGender" @change="validateRegGender" />
                    女
                  </label>
                </div>
                <div v-if="regGenderError" class="error-message">
                  <el-icon><Warning /></el-icon>
                  {{ regGenderError }}
                </div>
              </div>

              <div class="form-group" :class="{ 'has-error': regPhoneError }">
                <label for="reg-phone" class="form-label">
                  <el-icon><User /></el-icon>
                  手机号
                </label>
                <div class="input-wrapper">
                  <input
                    id="reg-phone"
                    v-model="regPhone"
                    type="tel"
                    inputmode="numeric"
                    class="form-input"
                    placeholder="请输入手机号"
                    :class="{ 'input-error': regPhoneError }"
                    @blur="validateRegPhone"
                    autocomplete="tel"
                  />
                </div>
                <div v-if="regPhoneError" class="error-message">
                  <el-icon><Warning /></el-icon>
                  {{ regPhoneError }}
                </div>
              </div>
            </div>

            <button
              type="button"
              class="submit-button"
              :disabled="studentRegisterLoading || !isRegisterValid"
              :class="{ loading: studentRegisterLoading }"
              @click="submitStudentRegister"
            >
              <span v-if="!studentRegisterLoading">注册</span>
              <span v-else class="loading-text">
                <span class="spinner"></span>
                注册中...
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="login-footer">
        <p class="footer-text">
          登录即表示您同意我们的
          <button type="button" class="link-button">服务条款</button>
          和
          <button type="button" class="link-button">隐私政策</button>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  /* padding: 20px; */
  position: relative;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
  /* Dynamic scaling variables */
  --scale-factor: clamp(0.8, 1vw + 1vh, 2);
  --base-font-size: clamp(14px, 1.2vw, 24px);
  --base-padding: clamp(12px, 1.5vw, 24px);
  --base-margin: clamp(8px, 1vw, 16px);
  /* Ultra HD scaling */
  --ultra-hd-scale: 1;
  --ultra-hd-font-scale: 1;
  --ultra-hd-spacing-scale: 1;
}

/* Dynamic scaling based on viewport dimensions */
@media (min-width: 1920px) and (min-height: 1080px) {
  .login-page {
    --ultra-hd-scale: 1.2;
    --ultra-hd-font-scale: 1.3;
    --ultra-hd-spacing-scale: 1.2;
  }
}

@media (min-width: 2560px) and (min-height: 1440px) {
  .login-page {
    --ultra-hd-scale: 1.5;
    --ultra-hd-font-scale: 1.6;
    --ultra-hd-spacing-scale: 1.5;
  }
}

@media (min-width: 3840px) and (min-height: 2160px) {
  .login-page {
    --ultra-hd-scale: 2;
    --ultra-hd-font-scale: 2.2;
    --ultra-hd-spacing-scale: 2;
  }
}

@media (min-width: 7680px) and (min-height: 4320px) {
  .login-page {
    --ultra-hd-scale: 3;
    --ultra-hd-font-scale: 3.5;
    --ultra-hd-spacing-scale: 3;
  }
}

.login-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.05)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.05)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
  z-index: 1;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.login-container {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
  /* Dynamic scaling */
  font-size: var(--base-font-size);
  padding: var(--base-padding);
  /* Ultra HD scaling support */
  transform: scale(var(--ultra-hd-scale, 1));
  transform-origin: center;
  transition: transform 0.3s ease;
}

.role-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
}
.role-text {
  color: #374151;
}
.role-arrow {
  width: 20px;
  height: 20px;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 20px 20px;
  opacity: 0.8;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
}
.has-error .role-display {
  border-color: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}
.has-error .role-display:focus {
  border-color: #dc2626;
}

.role-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.role-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.role-card:hover {
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
}
.role-card.active {
  border-color: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
}
.role-card-title {
  font-weight: 600;
  color: #111827;
}
.role-card-desc {
  font-size: 12px;
  color: #6b7280;
}

.banner {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideDown 0.3s ease-out;
}
.banner.error {
  background: rgba(239, 68, 68, 0.95);
}
.banner.success {
  background: rgba(5, 150, 105, 0.95);
}

@keyframes slideDown {
  from {
    transform: translateX(-50%) translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: fadeInUp 0.6s ease-out;
}

.auth-switch {
  display: flex;
  gap: 6px;
  background: #f3f4f6;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
}
.switch-btn {
  flex: 1;
  border: none;
  background: transparent;
  color: #6b7280;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}
.switch-btn:hover {
  color: #4b5563;
}
.switch-btn.active {
  background: #ffffff;
  color: #667eea;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.sub-switch {
  display: flex;
  gap: 6px;
  background: #f3f4f6;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
}
.sub-switch .switch-btn {
  font-size: 13px;
}
.sub-switch .switch-btn.active {
  background: #ffffff;
  color: #667eea;
}
.gender-row {
  display: flex;
  gap: 16px;
  align-items: center;
}
.radio {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #374151;
  cursor: pointer;
}
.radio input[type='radio'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  accent-color: #10b981;
}
.radio input[type='radio']:hover {
  transform: scale(1.1);
}
.radio input[type='radio']:focus {
  outline: 2px solid #10b981;
  outline-offset: 2px;
}

/* 现代下拉框样式 */
.select-wrapper {
  position: relative;
}
.modern-select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  padding: 12px 44px 12px 16px;
  font-size: var(--base-font-size);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 20px 20px;
}
.modern-select:hover {
  border-color: #d1d5db;
  background-color: #ffffff;
}
.modern-select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
}
.modern-select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.has-error .modern-select {
  border-color: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}
.has-error .modern-select:focus {
  border-color: #dc2626;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.logo-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: contain;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  animation: float 3s ease-in-out infinite;
  padding: 6px;
  display: block;
  margin: 0 auto;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.card-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.card-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
  font-weight: 400;
}

.login-form {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
  position: relative;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
  line-height: 1.4;
}

.form-label .el-icon {
  font-size: 16px;
  color: #9ca3af;
}

.input-wrapper {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  line-height: 1.5;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  background: #ffffff;
}

.form-input::placeholder {
  color: #9ca3af;
}

.form-input.input-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

.form-input.input-error:focus {
  border-color: #dc2626;
}

.input-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #10b981;
  font-size: 16px;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-toggle:hover {
  color: #6b7280;
  background: rgba(0, 0, 0, 0.05);
}

.password-toggle:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #ef4444;
  margin-top: 6px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  accent-color: #667eea;
}

.checkbox-input:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.checkbox-label {
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
}

.link-button {
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.link-button:hover {
  color: #5a67d8;
  background: rgba(102, 126, 234, 0.1);
}

.link-button:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.submit-button {
  width: 100%;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.submit-button:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.submit-button.loading {
  pointer-events: none;
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.divider {
  display: flex;
  align-items: center;
  margin: 32px 0;
  color: #9ca3af;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.divider-text {
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
}

.social-login {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.social-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
}

.social-button:hover {
  background: #ffffff;
  border-color: #d1d5db;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.social-button:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.social-icon {
  font-size: 20px;
  line-height: 1;
}

.login-footer {
  margin-top: 32px;
  text-align: center;
}

.footer-text {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
  line-height: 1.5;
}

.register-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.register-grid .form-group {
  margin-bottom: 0;
}

.register-grid .form-group:last-child:nth-child(odd) {
  grid-column: 1 / -1;
}

.login-mode-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.mode-button {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.mode-button.active {
  background: #667eea;
  border-color: #667eea;
  color: #ffffff;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .register-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .register-grid .form-group:last-child:nth-child(odd) {
    grid-column: 1;
  }

  .login-card {
    padding: 32px 24px;
    margin: 0 16px;
  }

  .card-title {
    font-size: 24px;
  }

  .logo-image {
    width: 64px;
    height: 64px;
  }

  .auth-switch {
    flex-direction: column;
    gap: 8px;
  }

  .switch-btn {
    padding: 10px 8px;
    font-size: 13px;
  }

  .social-login {
    gap: 8px;
  }

  .social-button {
    padding: 12px 8px;
  }

  .login-page {
    padding: 16px;
  }
}

@media (max-width: 360px) {
  .login-card {
    padding: 24px 16px;
  }

  .card-title {
    font-size: 20px;
  }

  .logo-image {
    width: 56px;
    height: 56px;
  }

  .form-input {
    padding: 10px 14px;
    font-size: 14px;
  }

  .submit-button {
    padding: 12px 20px;
    font-size: 14px;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  .login-container {
    max-width: 380px;
  }

  .login-card {
    padding: 36px 28px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .login-container {
    max-width: 400px;
  }
}

@media (min-width: 1025px) and (max-width: 1440px) {
  .login-container {
    max-width: 440px;
  }
}

@media (min-width: 1441px) and (max-width: 1920px) {
  .login-container {
    max-width: 480px;
  }

  .login-card {
    padding: 48px;
  }

  .card-title {
    font-size: 32px;
  }

  .logo-image {
    width: 96px;
    height: 96px;
  }
}

/* Ultra HD Support - 2160x3840 and above */
@media (min-width: 2160px) and (min-height: 3840px) {
  :root {
    --ultra-hd-scale: 1.5;
    --ultra-hd-font-scale: 1.8;
    --ultra-hd-spacing-scale: 1.6;
  }

  .login-container {
    max-width: 800px;
    transform: scale(var(--ultra-hd-scale));
    transform-origin: center;
    /* Enhanced scaling for ultra-high resolution */
    zoom: 1.2;
  }

  .login-card {
    padding: 80px;
    border-radius: 48px;
  }

  .card-title {
    font-size: 56px;
    margin-bottom: 24px;
  }

  .card-subtitle {
    font-size: 28px;
    margin-bottom: 48px;
  }

  .logo-image {
    width: 160px;
    height: 160px;
    margin-bottom: 32px;
  }

  .form-label {
    font-size: 24px;
    margin-bottom: 16px;
  }

  .form-input {
    padding: 24px 32px;
    font-size: 28px;
    border-radius: 16px;
  }

  .submit-button {
    padding: 28px 48px;
    font-size: 32px;
    border-radius: 16px;
  }

  .auth-switch {
    margin-bottom: 32px;
    padding: 8px;
    border-radius: 20px;
  }

  .switch-btn {
    padding: 20px 24px;
    font-size: 24px;
    border-radius: 16px;
  }

  .sub-switch {
    margin-bottom: 32px;
    padding: 8px;
    border-radius: 20px;
  }

  .gender-row {
    gap: 32px;
  }

  .radio {
    font-size: 24px;
    gap: 12px;
  }

  .radio input[type='radio'] {
    width: 28px;
    height: 28px;
  }

  .modern-select {
    font-size: 28px;
    padding: 24px 56px 24px 20px;
    border-radius: 16px;
    background-size: 24px 24px;
  }

  .error-message {
    font-size: 20px;
    margin-top: 12px;
  }

  .divider {
    margin: 48px 0;
  }

  .divider-text {
    font-size: 24px;
    padding: 0 24px;
  }

  .social-login {
    gap: 24px;
  }

  .social-button {
    padding: 32px 24px;
    font-size: 20px;
    border-radius: 16px;
  }

  .social-icon {
    font-size: 32px;
  }

  .login-footer {
    margin-top: 48px;
  }

  .footer-text {
    font-size: 22px;
  }

  .link-button {
    font-size: 22px;
    padding: 8px 16px;
  }

  .banner {
    top: 48px;
    padding: 24px 32px;
    border-radius: 20px;
    font-size: 24px;
  }
}

/* 4K and above support */
@media (min-width: 3840px) and (min-height: 2160px) {
  .login-container {
    max-width: 1000px;
    transform: scale(2);
    transform-origin: center;
    /* Enhanced scaling for 4K+ resolution */
    zoom: 1.5;
  }

  .login-card {
    padding: 120px;
    border-radius: 64px;
  }

  .card-title {
    font-size: 72px;
    margin-bottom: 32px;
  }

  .card-subtitle {
    font-size: 36px;
    margin-bottom: 64px;
  }

  .logo-image {
    width: 200px;
    height: 200px;
    margin-bottom: 48px;
  }

  .form-label {
    font-size: 32px;
    margin-bottom: 20px;
  }

  .form-input {
    padding: 32px 40px;
    font-size: 36px;
    border-radius: 20px;
  }

  .submit-button {
    padding: 36px 60px;
    font-size: 40px;
    border-radius: 20px;
  }

  .auth-switch {
    margin-bottom: 48px;
    padding: 12px;
    border-radius: 24px;
  }

  .switch-btn {
    padding: 24px 32px;
    font-size: 28px;
    border-radius: 20px;
  }

  .sub-switch {
    margin-bottom: 48px;
    padding: 12px;
    border-radius: 24px;
  }

  .gender-row {
    gap: 48px;
  }

  .radio {
    font-size: 32px;
    gap: 16px;
  }

  .radio input[type='radio'] {
    width: 36px;
    height: 36px;
  }

  .modern-select {
    font-size: 36px;
    padding: 32px 64px 32px 24px;
    border-radius: 20px;
    background-size: 28px 28px;
  }

  .error-message {
    font-size: 24px;
    margin-top: 16px;
  }

  .divider {
    margin: 64px 0;
  }

  .divider-text {
    font-size: 28px;
    padding: 0 32px;
  }

  .social-login {
    gap: 32px;
  }

  .social-button {
    padding: 40px 32px;
    font-size: 24px;
    border-radius: 20px;
  }

  .social-icon {
    font-size: 40px;
  }

  .login-footer {
    margin-top: 64px;
  }

  .footer-text {
    font-size: 28px;
  }

  .link-button {
    font-size: 28px;
    padding: 12px 20px;
  }

  .banner {
    top: 64px;
    padding: 32px 40px;
    border-radius: 24px;
    font-size: 28px;
  }
}

/* 8K and extreme resolution support */
@media (min-width: 7680px) and (min-height: 4320px) {
  :root {
    --extreme-scale: 3.5;
    --extreme-font-scale: 4;
    --extreme-spacing-scale: 3.5;
  }

  .login-container {
    max-width: 1400px;
    transform: scale(var(--extreme-scale));
    zoom: 2;
  }

  .card-title {
    font-size: clamp(72px, 5vw, 96px);
  }

  .card-subtitle {
    font-size: clamp(36px, 2.5vw, 48px);
  }

  .logo-image {
    width: clamp(200px, 15vw, 280px);
    height: clamp(200px, 15vw, 280px);
  }

  .form-label {
    font-size: clamp(32px, 2.5vw, 40px);
  }

  .form-input {
    font-size: clamp(36px, 3vw, 48px);
    padding: clamp(32px, 2.5vw, 40px) clamp(40px, 3vw, 50px);
  }

  .submit-button {
    font-size: clamp(40px, 3.5vw, 52px);
    padding: clamp(36px, 3vw, 48px) clamp(60px, 4vw, 80px);
  }

  .switch-btn {
    font-size: clamp(28px, 2.5vw, 36px);
    padding: clamp(24px, 2vw, 32px) clamp(32px, 2.5vw, 40px);
  }

  .radio {
    font-size: clamp(32px, 2.5vw, 40px);
  }

  .radio input[type='radio'] {
    width: clamp(36px, 2.5vw, 48px);
    height: clamp(36px, 2.5vw, 48px);
  }

  .modern-select {
    font-size: clamp(36px, 3vw, 48px);
    padding: clamp(32px, 2.5vw, 40px) clamp(64px, 4vw, 72px);
    border-radius: 20px;
    background-size: clamp(24px, 2vw, 32px) clamp(24px, 2vw, 32px);
  }

  .footer-text {
    font-size: clamp(28px, 2.5vw, 36px);
  }

  .link-button {
    font-size: clamp(28px, 2.5vw, 36px);
  }

  .banner {
    font-size: clamp(28px, 2.5vw, 36px);
    padding: clamp(32px, 2.5vw, 40px) clamp(40px, 3vw, 50px);
  }
}

/* Universal scaling for any ultra-high resolution */
@media (min-width: 4320px) and (min-height: 7680px) {
  .login-container {
    max-width: 1800px;
    transform: scale(4);
    zoom: 2.5;
  }

  .login-card {
    padding: 160px;
    border-radius: 80px;
  }

  .card-title {
    font-size: clamp(96px, 6vw, 120px);
  }

  .logo-image {
    width: clamp(320px, 20vw, 400px);
    height: clamp(320px, 20vw, 400px);
  }
}

@media (max-width: 360px) {
  .login-card {
    padding: 24px 20px;
  }

  .logo-image {
    width: 56px;
    height: 56px;
    padding: 6px;
  }

  .card-title {
    font-size: 22px;
  }

  .social-login {
    flex-direction: column;
  }

  .social-button {
    flex-direction: row;
    justify-content: center;
    gap: 12px;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .login-card {
    background: #ffffff;
    border: 2px solid #000000;
  }

  .form-input {
    border-width: 2px;
  }

  .submit-button {
    border: 2px solid #000000;
  }

  .logo-image {
    background: #ffffff;
    border: 2px solid #000000;
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .login-page {
    animation: none;
  }

  .login-card {
    animation: none;
  }

  .logo-image {
    animation: none;
  }
}

/* 暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .login-page {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  }

  .login-card {
    background: rgba(30, 41, 59, 0.95);
    color: #f1f5f9;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .card-title {
    color: #f8fafc;
  }

  .card-subtitle {
    color: #cbd5e1;
  }

  .form-label {
    color: #e2e8f0;
  }

  .form-input {
    background: rgba(15, 23, 42, 0.8);
    border-color: #475569;
    color: #f1f5f9;
  }

  .form-input:focus {
    border-color: #818cf8;
    background: #1e293b;
  }

  .form-input::placeholder {
    color: #64748b;
  }

  .checkbox-label {
    color: #cbd5e1;
  }

  .social-button {
    background: rgba(30, 41, 59, 0.8);
    border-color: #475569;
    color: #cbd5e1;
  }

  .social-button:hover {
    background: #334155;
    border-color: #64748b;
  }

  .footer-text {
    color: #94a3b8;
  }

  .logo-image {
    background: #ffffff;
    border: 2px solid #475569;
    width: 80px;
    height: 80px;
  }

  .auth-switch {
    background: #1f2937;
  }
  .switch-btn {
    color: #94a3b8;
  }
  .switch-btn:hover {
    color: #e2e8f0;
  }
  .switch-btn.active {
    background: #334155;
    color: #818cf8;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .sub-switch {
    background: #1f2937;
  }
  .sub-switch .switch-btn.active {
    background: #334155;
    color: #818cf8;
  }

  .radio input[type='radio'] {
    accent-color: #34d399;
  }
  .radio input[type='radio']:hover {
    transform: scale(1.1);
  }
  .radio input[type='radio']:focus {
    outline-color: #34d399;
  }

  .modern-select {
    background-color: rgba(15, 23, 42, 0.8);
    border-color: #475569;
    color: #f1f5f9;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  }
  .modern-select:focus {
    border-color: #34d399;
    box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.12);
  }
}
</style>
