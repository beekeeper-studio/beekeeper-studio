import _Vue from 'vue'

export async function copyText(text: string): Promise<{ action: 'copy', text: string }> {
  const value = text == null ? '' : String(text)
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return { action: 'copy', text: value }
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    const ok = document.execCommand('copy')
    if (!ok) throw new Error('Copy command was unsuccessful')
  } finally {
    document.body.removeChild(textarea)
  }
  return { action: 'copy', text: value }
}

type Handlers = {
  refs: number
  copy?: () => unknown
  success?: (e: { action: 'copy', text: string }) => void
  error?: (e: Error) => void
  click?: (e: Event) => void
}

const STORE = new WeakMap<HTMLElement, Handlers>()

function ensureEntry(el: HTMLElement): Handlers {
  let entry = STORE.get(el)
  if (!entry) {
    entry = { refs: 0 }
    entry.click = () => {
      const current = STORE.get(el)
      if (!current) return
      const raw = current.copy?.()
      const text = raw == null ? '' : String(raw)
      copyText(text)
        .then((result) => current.success?.(result))
        .catch((err) => current.error?.(err instanceof Error ? err : new Error(String(err))))
    }
    el.addEventListener('click', entry.click)
    STORE.set(el, entry)
  }
  return entry
}

function setBinding(el: HTMLElement, arg: string | undefined, value: unknown) {
  const entry = ensureEntry(el)
  if (arg === 'copy') {
    entry.copy = () => value
  } else if (arg === 'success') {
    entry.success = typeof value === 'function' ? (value as Handlers['success']) : undefined
  } else if (arg === 'error') {
    entry.error = typeof value === 'function' ? (value as Handlers['error']) : undefined
  }
}

function bind(el: HTMLElement, binding: { arg?: string, value: unknown }) {
  const entry = ensureEntry(el)
  entry.refs += 1
  setBinding(el, binding.arg, binding.value)
}

function update(el: HTMLElement, binding: { arg?: string, value: unknown }) {
  setBinding(el, binding.arg, binding.value)
}

function unbind(el: HTMLElement) {
  const entry = STORE.get(el)
  if (!entry) return
  entry.refs -= 1
  if (entry.refs <= 0 && entry.click) {
    el.removeEventListener('click', entry.click)
    STORE.delete(el)
  }
}

export default {
  install(Vue: typeof _Vue) {
    Vue.prototype.$copyText = copyText
    Vue.directive('clipboard', { bind, update, unbind })
  },
}
