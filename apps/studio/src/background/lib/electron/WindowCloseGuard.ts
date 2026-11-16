import type { App, BrowserWindow, Event, IpcMain, IpcMainEvent } from 'electron'
import { AppEvent } from '@/common/AppEvent'

export interface WindowCloseState {
  bypassed: boolean
  quitRequested: boolean
}

/** Lets the renderer's window close listeners prevent a window from closing. */
export class WindowCloseGuard {
  listenerCount = 0
  private allowed = false
  private pending: Promise<boolean> | null = null

  constructor(
    private win: BrowserWindow,
    private ipcMain: Pick<IpcMain, 'on' | 'removeListener'>,
    private app: Pick<App, 'quit'>,
    private state: WindowCloseState
  ) {
    win.on('close', (event) => this.onClose(event))
    const reset = () => { this.listenerCount = 0 }
    win.webContents.on('did-navigate', reset)
    win.webContents.on('render-process-gone', reset)
  }

  private onClose(event: Event) {
    if (this.allowed || this.state.bypassed || this.listenerCount === 0) return
    if (this.win.webContents.isDestroyed()) return

    event.preventDefault()
    if (!this.pending) {
      this.pending = this.askListeners().finally(() => { this.pending = null })
    }
    this.pending.then((prevented) => {
      if (prevented) {
        this.state.quitRequested = false
        return
      }
      // stays set: the window may still be closing when a resumed quit closes it again
      this.allowed = true
      if (this.state.quitRequested) this.app.quit()
      else if (!this.win.isDestroyed()) this.win.close()
    })
  }

  private askListeners(): Promise<boolean> {
    const webContents = this.win.webContents

    return new Promise((resolve) => {
      const finish = (prevented: boolean) => {
        this.ipcMain.removeListener(AppEvent.windowCloseResponse, onResponse)
        webContents.removeListener('destroyed', onRendererGone)
        webContents.removeListener('render-process-gone', onRendererGone)
        webContents.removeListener('unresponsive', onRendererGone)
        webContents.removeListener('did-navigate', onRendererGone)
        resolve(prevented)
      }
      const onResponse = (event: IpcMainEvent, prevented: boolean) => {
        if (event.sender === webContents) finish(!!prevented)
      }
      // no timer: a dead renderer is the only thing that may close a window whose listeners haven't answered
      const onRendererGone = () => finish(false)

      this.ipcMain.on(AppEvent.windowCloseResponse, onResponse)
      webContents.once('destroyed', onRendererGone)
      webContents.once('render-process-gone', onRendererGone)
      webContents.once('unresponsive', onRendererGone)
      webContents.once('did-navigate', onRendererGone)
      webContents.send(AppEvent.windowClose)
    })
  }
}
