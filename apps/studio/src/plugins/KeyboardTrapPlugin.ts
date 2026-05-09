import _Vue from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

function isVisible(el: HTMLElement): boolean {
  if (el.hidden) return false
  if (el.getAttribute('aria-hidden') === 'true') return false
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => el.tabIndex !== -1 && !el.hasAttribute('disabled') && isVisible(el))
}

const HANDLERS = new WeakMap<HTMLElement, (e: KeyboardEvent) => void>()

function makeHandler(container: HTMLElement) {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Tab' && e.keyCode !== 9) return
    const focusable = getFocusable(container)
    if (focusable.length === 0) {
      e.preventDefault()
      container.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement as HTMLElement | null
    const isInside = active != null && container.contains(active)
    if (e.shiftKey) {
      if (!isInside || active === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (!isInside || active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}

function attach(el: HTMLElement) {
  if (HANDLERS.has(el)) return
  const handler = makeHandler(el)
  HANDLERS.set(el, handler)
  el.addEventListener('keydown', handler)
}

function detach(el: HTMLElement) {
  const handler = HANDLERS.get(el)
  if (!handler) return
  el.removeEventListener('keydown', handler)
  HANDLERS.delete(el)
}

function bind(el: HTMLElement, binding: { value: unknown }) {
  if (binding.value === false) return
  attach(el)
}

function update(el: HTMLElement, binding: { value: unknown, oldValue: unknown }) {
  if (binding.value === binding.oldValue) return
  detach(el)
  if (binding.value !== false) attach(el)
}

function unbind(el: HTMLElement) {
  detach(el)
}

export default {
  install(Vue: typeof _Vue) {
    Vue.directive('kbd-trap', { bind, update, unbind })
  },
}
