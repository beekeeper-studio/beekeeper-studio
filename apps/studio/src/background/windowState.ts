import * as fs from 'fs'
import path from 'path'
import _ from 'lodash'
import platformInfo from '../common/platform_info'
import rawLog from '@bksLogger'

const log = rawLog.scope('windowState')

// A tiny, fast cache of the window's geometry/theme, stored OUTSIDE the SQLite
// settings DB. It exists so the first window can be constructed and shown before
// the DB is connected and migrations have run (those create the user_setting
// table that the authoritative settings come from). On every launch we refresh
// this cache from the real settings once they load, so it stays in sync.

export interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  maximized: boolean
  dark: boolean
  zoomLevel: number
}

const DEFAULT_STATE: WindowState = {
  width: 1200,
  height: 800,
  maximized: false,
  dark: true,
  zoomLevel: 0,
}

function statePath(): string {
  return path.join(platformInfo.userDirectory, 'window-state.json')
}

let cacheExisted = false

export function windowStateExisted(): boolean {
  return cacheExisted
}

export function readWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(statePath(), 'utf-8')
    const parsed = JSON.parse(raw)
    cacheExisted = true
    return { ...DEFAULT_STATE, ...parsed }
  } catch (e) {
    cacheExisted = false
    return { ...DEFAULT_STATE }
  }
}

let pending: Partial<WindowState> = {}

const flush = _.debounce(() => {
  const next = pending
  pending = {}
  try {
    const current = readWindowState()
    fs.writeFileSync(statePath(), JSON.stringify({ ...current, ...next }))
  } catch (e) {
    log.error('failed to save window state', e)
  }
}, 500)

export function saveWindowState(partial: Partial<WindowState>): void {
  pending = { ...pending, ...partial }
  flush()
}
