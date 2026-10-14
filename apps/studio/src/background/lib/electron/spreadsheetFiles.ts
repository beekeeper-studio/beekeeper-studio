import fs from 'fs'
import path from 'path'
import { app, ipcMain, shell } from 'electron'
import rawLog from '@bksLogger'

const log = rawLog.scope('spreadsheetFiles')

const DIRECTORY_NAME = 'beekeeper-studio-spreadsheets'
// files are left behind for the spreadsheet app, clean them up on a later run
const STALE_AFTER_MS = 24 * 60 * 60 * 1000

let initialized = false

export function spreadsheetDirectory(): string {
  return path.join(app.getPath('temp'), DIRECTORY_NAME)
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

/**
 * Turn a table / query name into a safe .xlsx file name.
 * Excel can't open two workbooks with the same name, so names include a timestamp.
 */
export function spreadsheetFileName(name: unknown, date = new Date(), suffix = ''): string {
  const base = (typeof name === 'string' ? name : '')
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60) || 'results'
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${base}-${stamp}${suffix}.xlsx`
}

/**
 * Pure predicate — only .xlsx files that live directly in `directory` may be
 * opened. Anything else (executables, other folders, path tricks) is refused.
 */
export function isOpenableSpreadsheet(filePath: unknown, directory: string): filePath is string {
  if (typeof filePath !== 'string' || !filePath) return false
  const resolved = path.resolve(filePath)
  return path.dirname(resolved) === path.resolve(directory) &&
    path.extname(resolved).toLowerCase() === '.xlsx'
}

async function removeStaleFiles(directory: string): Promise<void> {
  try {
    const now = Date.now()
    for (const file of await fs.promises.readdir(directory)) {
      const filePath = path.join(directory, file)
      try {
        const stat = await fs.promises.stat(filePath)
        if (stat.isFile() && now - stat.mtimeMs > STALE_AFTER_MS) {
          await fs.promises.unlink(filePath)
        }
      } catch {
        // probably still open in another app, try again next time
      }
    }
  } catch (e) {
    log.warn('Unable to clean up old spreadsheet files', e)
  }
}

/** Reserve a path in the temp directory for a new spreadsheet */
export async function newSpreadsheetPath(name: unknown): Promise<string> {
  const directory = spreadsheetDirectory()
  await fs.promises.mkdir(directory, { recursive: true })
  await removeStaleFiles(directory)

  const date = new Date()
  let filePath = path.join(directory, spreadsheetFileName(name, date))
  for (let i = 2; fs.existsSync(filePath); i++) {
    filePath = path.join(directory, spreadsheetFileName(name, date, `_${i}`))
  }
  return filePath
}

/**
 * Open a spreadsheet created by newSpreadsheetPath with the system's default
 * app for .xlsx files. Returns an error message, or '' on success.
 */
export async function openSpreadsheet(filePath: unknown): Promise<string> {
  if (!isOpenableSpreadsheet(filePath, spreadsheetDirectory())) {
    log.warn('Refusing to open spreadsheet outside of the spreadsheet directory:', filePath)
    return 'Invalid spreadsheet path'
  }
  if (!fs.existsSync(filePath)) {
    return 'Spreadsheet file not found'
  }
  return await shell.openPath(filePath)
}

export function initializeSpreadsheetFiles(): void {
  if (initialized) return

  ipcMain.handle('spreadsheet:newPath', (_event, name: unknown) => newSpreadsheetPath(name))
  ipcMain.handle('spreadsheet:open', (_event, filePath: unknown) => openSpreadsheet(filePath))

  initialized = true
}
