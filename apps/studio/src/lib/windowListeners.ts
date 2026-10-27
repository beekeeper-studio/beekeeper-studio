import rawLog from '@bksLogger'

const log = rawLog.scope('windowListeners')

export type WindowEventType = 'close'

export interface WindowCloseEvent {
  preventClose(): void
}

export type WindowListener = (event: WindowCloseEvent) => void | Promise<void>

const listeners: Record<WindowEventType, WindowListener[]> = { close: [] }

export function addWindowListener(type: WindowEventType, listener: WindowListener): void {
  if (listeners[type].includes(listener)) return
  listeners[type].push(listener)
  window.main.setWindowListenerCount(type, listeners[type].length)
}

export function removeWindowListener(type: WindowEventType, listener: WindowListener): void {
  const idx = listeners[type].indexOf(listener)
  if (idx === -1) return
  listeners[type].splice(idx, 1)
  window.main.setWindowListenerCount(type, listeners[type].length)
}

/** Runs the close listeners in order. Resolves to whether one of them prevented the close. */
export async function dispatchWindowClose(): Promise<boolean> {
  let prevented = false
  for (const listener of [...listeners.close]) {
    try {
      await listener({ preventClose: () => { prevented = true } })
    } catch (ex) {
      log.error('window close listener failed', ex)
    }
  }
  return prevented
}
