import NextCas from '@nextcas/sdk'
import { createAccessToken } from './token'
import './assets/main.css'
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import { createApp } from 'vue'
import Admin from './admin/admin.vue'
import Login from './login.vue'
import App from './App.vue'
import { apiJson } from '@/utils/request'

declare global {
  interface Window {
    token?: string
    id?: number
    _redirectingToLogin?: boolean
  }
}
;(async () => {
  if (localStorage.token) {
    ;(window as any).token = localStorage.token
    const params = new URLSearchParams(location.search)
    const wantsAdmin =
      params.has('admin') || location.pathname.startsWith('/admin')
    let me: any = null
    try {
      me = (await apiJson('api/v1/users/me')) as any
    } catch {}
    const isAdminUser = !!(
      me && String(me.role || '').toLowerCase() === 'admin'
    )
    if (isAdminUser && me && typeof me.user_id === 'number') {
      window.id = me.user_id
    }
    const shouldMountAdmin = wantsAdmin && isAdminUser
    if (!shouldMountAdmin && wantsAdmin) {
      const url = new URL(location.href)
      url.searchParams.delete('admin')
      if (url.pathname.startsWith('/admin')) url.pathname = '/'
      history.replaceState(null, '', url)
    }
    const app = createApp(
      (() => {
        if (params.has('admin')) return Admin
        if (params.has('app')) return App
        return location.origin === 'file://' ? App : Admin
      })()
    )
    app.use(ElementPlus, { locale: zhCn })
    app.mount('#app')
    if (shouldMountAdmin) document.body.classList.add('admin-mode')
    else document.body.classList.remove('admin-mode')
  } else {
    const app = createApp(Login)
    app.use(ElementPlus, { locale: zhCn })
    app.mount('#app')
    document.body.classList.remove('admin-mode')
  }
})()
