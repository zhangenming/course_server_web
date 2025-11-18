<script setup lang="ts">
import { ref, computed } from 'vue'
import { apiJson } from '@/utils/request'
import { apiFetch } from '@/utils/request'
import { ElIcon } from 'element-plus'
import {
  User,
  Lock,
  View,
  Hide,
  Warning,
  CircleCheck,
} from '@element-plus/icons-vue'

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const rememberMe = ref(false)
const usernameError = ref('')
const passwordError = ref('')

let hideTimer: number | undefined

const notify = (msg: string) => {
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
    const passwordInput = document.querySelector(
      'input[type="password"], input[type="text"]'
    ) as HTMLInputElement
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
      <div v-if="error" class="banner" role="alert" @click="error = null">
        <el-icon><Warning /></el-icon>
        {{ error }}
      </div>

      <div class="login-card">
        <div class="card-header">
          <div class="logo">
            <img src="/src/assets/logomini.png" alt="Logo" class="logo-image" />
          </div>
          <h1 class="card-title">欢迎回来</h1>
          <p class="card-subtitle">请登录您的管理员账户</p>
        </div>

        <form class="login-form" @submit.prevent="submit">
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
              <button
                type="button"
                class="password-toggle"
                @click="togglePasswordVisibility"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              >
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
              <input
                v-model="rememberMe"
                type="checkbox"
                class="checkbox-input"
              />
              <span class="checkbox-label">记住登录状态</span>
            </label>
            <button type="button" class="link-button" @click="forgotPassword">
              忘记密码？
            </button>
          </div>

          <button
            type="submit"
            class="submit-button"
            :disabled="loading || !isFormValid"
            :class="{ loading: loading }"
          >
            <span v-if="!loading">登录</span>
            <span v-else class="loading-text">
              <span class="spinner"></span>
              登录中...
            </span>
          </button>
        </form>

        <div class="divider">
          <span class="divider-text">或使用以下方式登录</span>
        </div>

        <!-- <div class="social-login">
          <button
            type="button"
            class="social-button"
            @click="socialLogin('微信')"
            aria-label="微信登录"
          >
            <span class="social-icon">💬</span>
            <span>微信</span>
          </button>
          <button
            type="button"
            class="social-button"
            @click="socialLogin('QQ')"
            aria-label="QQ登录"
          >
            <span class="social-icon">🐧</span>
            <span>QQ</span>
          </button>
          <button
            type="button"
            class="social-button"
            @click="socialLogin('钉钉')"
            aria-label="钉钉登录"
          >
            <span class="social-icon">🔔</span>
            <span>钉钉</span>
          </button> -->
        <!-- </div> -->
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
  padding: 20px;
  position: relative;
  overflow: hidden;
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
}

.banner {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.95);
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
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: fadeInUp 0.6s ease-out;
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
  width: 64px;
  height: 64px;
  border-radius: 16px;
  object-fit: contain;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
  animation: float 3s ease-in-out infinite;
  padding: 8px;
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

/* 响应式设计 */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
    margin: 0 16px;
  }

  .card-title {
    font-size: 24px;
  }

  .social-login {
    gap: 8px;
  }

  .social-button {
    padding: 12px 8px;
  }

  .form-options {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
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
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  }
}
</style>
