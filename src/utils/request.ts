// 定义列表数据接口
interface ListResponse<T = any> {
  items: T[]
  page: number
  pagesize: number
  total: number
}

// 定义分页信息接口
interface PaginationInfo {
  page: number
  pagesize: number
  total: number
}

// 定义统一返回格式接口
interface UnifiedResponse<T = any> {
  data: T[] | T
  pagination?: PaginationInfo
}

// 定义错误响应接口
interface ErrorResponse {
  message?: string
  messgae?: string  // 兼容后端拼写错误
  detail?: string
}

// 类型守卫函数：检查是否为列表响应
function isListResponse(data: any): data is ListResponse {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.items) &&
    typeof data.page === 'number' &&
    typeof data.pagesize === 'number' &&
    typeof data.total === 'number'
  )
}

// 类型守卫函数：检查是否为错误响应
function isErrorResponse(data: any): data is ErrorResponse {
  return (
    data &&
    typeof data === 'object' &&
    (typeof data.message === 'string' ||
      typeof data.messgae === 'string' ||
      typeof data.detail === 'string')
  )
}

export function apiFetch(input: string, init?: any) {
  const headers = new Headers(init?.headers as any)
  const token = (localStorage as any).token
  if (token && !headers.has('Authorization'))
    headers.set('Authorization', `Bearer ${token}`)
  let url = input
  if (location.origin === 'file://') {
    url = 'http://xfjs-api.zkyr.net.cn/' + url
  } else {
    url = 'vite/' + url
  }
  let method = 'GET'
  if (init && typeof init === 'object' && typeof init.method === 'string')
    method = String(init.method).toUpperCase()
  const known: Record<string, true> = {
    method: true,
    headers: true,
    body: true,
    params: true,
    signal: true,
    mode: true,
    cache: true,
    credentials: true,
    redirect: true,
    referrer: true,
    referrerPolicy: true,
    integrity: true,
    keepalive: true,
    window: true,
  }
  const buildParams = (obj: any) => {
    const sp = new URLSearchParams()
    for (const k in obj || {}) {
      if (known[k]) continue
      const v = obj[k]
      if (v === undefined || v === null) continue
      if (Array.isArray(v)) v.forEach(x => sp.append(k, String(x)))
      else sp.append(k, String(v))
    }
    return sp
  }
  const fetchInit: RequestInit = { headers }
  if (method === 'GET') {
    const source =
      init && typeof init === 'object' ? init.params ?? init : undefined
    const sp = source ? buildParams(source) : undefined
    if (sp && String(sp)) {
      const qs = sp.toString()
      if (qs) url += (url.includes('?') ? '&' : '?') + qs
    }
    fetchInit.method = 'GET'
  } else {
    let body: any = undefined
    if (init && typeof init === 'object' && 'body' in init) body = init.body
    else if (
      init &&
      typeof FormData !== 'undefined' &&
      init instanceof FormData
    )
      body = init
    else if (init && typeof init === 'object') {
      const payload: any = {}
      for (const k in init) {
        if (known[k]) continue
        payload[k] = init[k]
      }
      body = payload
    }
    if (body && typeof FormData !== 'undefined' && body instanceof FormData) {
      headers.delete('Content-Type')
      fetchInit.body = body as any
    } else if (body !== undefined) {
      if (!headers.has('Content-Type'))
        headers.set('Content-Type', 'application/json')
      fetchInit.body =
        typeof body === 'string' ? (body as any) : JSON.stringify(body)
    }
    fetchInit.method = method
  }
  return fetch(url, fetchInit).then(res => {
    if (res.status === 401 && !(window as any)._redirectingToLogin) {
      ;(window as any)._redirectingToLogin = true
      try {
        delete (window as any).token
        delete (localStorage as any).token
      } catch {}
      try {
        location.reload()
      } catch {}
    }
    return res
  })
}
declare global {
  interface Window {
    apiJson: typeof apiJson
  }
}

/**
 * 增强版apiJson函数，支持列表数据自动提取和统一格式化
 * 
 * 功能特点：
 * 1. 自动识别列表数据格式（包含items、page、pagesize、total字段）
 * 2. 提取items作为主要数据，保留分页信息
 * 3. 对对象数据保持原有处理逻辑
 * 4. 提供完整的类型支持
 * 
 * @param input - 请求URL
 * @param init - 请求配置选项
 * @returns 统一格式的响应数据
 */
export async function apiJson<T = any>(input: string, init?: any): Promise<T | UnifiedResponse<T>> {
  const res = await apiFetch(input, init)
  let data: any = null
  
  try {
    data = await res.json()
  } catch {
    data = null
  }
  
  // 处理HTTP错误
  if (!res.ok) {
    const errorData = data as ErrorResponse
    const msg =
      errorData?.message ||
      errorData?.messgae ||  // 兼容后端拼写错误
      errorData?.detail ||
      `请求失败(${res.status})`
    throw new Error(msg)
  }
  
  // 如果响应数据为空，直接返回
  if (!data) {
    return data
  }
  
  // 检查是否为列表响应格式
  if (isListResponse(data)) {
    // 提取列表数据和分页信息
    const { items, page, pagesize, total } = data
    return {
      data: items,
      pagination: {
        page,
        pagesize,
        total
      }
    } as UnifiedResponse<T>
  }
  
  // 检查是否为标准响应格式（包含data字段）
  if (data && typeof data === 'object' && 'data' in data) {
    return data.data
  }
  
  // 对于其他对象数据，保持原有处理逻辑
  return data as T
}

window.apiJson = apiJson
