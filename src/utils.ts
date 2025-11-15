export function simulateClick() {
  const host = document.querySelector('#container > wujie-app') as any
  const root = host?.shadowRoot
  const el = root?.querySelector('#app > main > div') as HTMLElement | null
  el && typeof el.click === 'function' && el.click()
}

export function bytesToSize(bytes: number) {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}
