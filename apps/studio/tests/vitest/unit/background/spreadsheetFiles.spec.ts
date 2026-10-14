// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

const mocks = vi.hoisted(() => ({
  tempDir: '',
  openPath: vi.fn(async (_path: string) => ''),
}))

vi.mock('electron', () => ({
  app: { getPath: () => mocks.tempDir },
  ipcMain: { handle: vi.fn() },
  shell: { openPath: mocks.openPath },
}))

import {
  isOpenableSpreadsheet,
  newSpreadsheetPath,
  openSpreadsheet,
  spreadsheetDirectory,
  spreadsheetFileName,
} from '@/background/lib/electron/spreadsheetFiles'

describe('spreadsheetFileName', () => {
  const date = new Date(2026, 0, 2, 3, 4, 5)

  it('makes a safe, timestamped file name', () => {
    expect(spreadsheetFileName('public.users', date)).toBe('public_users-2026-01-02_030405.xlsx')
    expect(spreadsheetFileName('../../etc/passwd', date)).toBe('etc_passwd-2026-01-02_030405.xlsx')
    expect(spreadsheetFileName('my query', date, '_2')).toBe('my_query-2026-01-02_030405_2.xlsx')
  })

  it('falls back to a default name', () => {
    expect(spreadsheetFileName('', date)).toBe('results-2026-01-02_030405.xlsx')
    expect(spreadsheetFileName('!!!', date)).toBe('results-2026-01-02_030405.xlsx')
    expect(spreadsheetFileName(undefined, date)).toBe('results-2026-01-02_030405.xlsx')
  })
})

describe('isOpenableSpreadsheet', () => {
  const dir = path.resolve('/tmp/sheets')

  it('allows .xlsx files directly inside the directory', () => {
    expect(isOpenableSpreadsheet(path.join(dir, 'a.xlsx'), dir)).toBe(true)
    expect(isOpenableSpreadsheet(path.join(dir, 'a.XLSX'), dir)).toBe(true)
  })

  it('refuses anything else', () => {
    expect(isOpenableSpreadsheet(path.join(dir, 'a.exe'), dir)).toBe(false)
    expect(isOpenableSpreadsheet(path.join(dir, 'a.xlsx.exe'), dir)).toBe(false)
    expect(isOpenableSpreadsheet(path.join(dir, 'sub', 'a.xlsx'), dir)).toBe(false)
    expect(isOpenableSpreadsheet(path.join(dir, '..', 'a.xlsx'), dir)).toBe(false)
    expect(isOpenableSpreadsheet(path.resolve('/tmp/other/a.xlsx'), dir)).toBe(false)
    expect(isOpenableSpreadsheet('', dir)).toBe(false)
    expect(isOpenableSpreadsheet(null, dir)).toBe(false)
    expect(isOpenableSpreadsheet({ path: 'a.xlsx' }, dir)).toBe(false)
  })
})

describe('spreadsheet files', () => {
  beforeEach(() => {
    mocks.tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-sheets-'))
    mocks.openPath.mockClear()
  })

  afterEach(() => {
    fs.rmSync(mocks.tempDir, { recursive: true, force: true })
  })

  it('creates unique paths in the spreadsheet directory', async () => {
    const first = await newSpreadsheetPath('users')
    expect(path.dirname(first)).toBe(spreadsheetDirectory())
    expect(fs.existsSync(spreadsheetDirectory())).toBe(true)

    fs.writeFileSync(first, 'x')
    const second = await newSpreadsheetPath('users')
    expect(second).not.toBe(first)
    expect(isOpenableSpreadsheet(second, spreadsheetDirectory())).toBe(true)
  })

  it('cleans up files older than a day', async () => {
    const dir = spreadsheetDirectory()
    fs.mkdirSync(dir, { recursive: true })
    const stale = path.join(dir, 'old.xlsx')
    const fresh = path.join(dir, 'new.xlsx')
    fs.writeFileSync(stale, 'x')
    fs.writeFileSync(fresh, 'x')
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    fs.utimesSync(stale, twoDaysAgo, twoDaysAgo)

    await newSpreadsheetPath('users')

    expect(fs.existsSync(stale)).toBe(false)
    expect(fs.existsSync(fresh)).toBe(true)
  })

  it('opens spreadsheets it created', async () => {
    const filePath = await newSpreadsheetPath('users')
    fs.writeFileSync(filePath, 'x')
    expect(await openSpreadsheet(filePath)).toBe('')
    expect(mocks.openPath).toHaveBeenCalledWith(filePath)
  })

  it('reports missing files', async () => {
    const filePath = await newSpreadsheetPath('users')
    expect(await openSpreadsheet(filePath)).toBe('Spreadsheet file not found')
    expect(mocks.openPath).not.toHaveBeenCalled()
  })

  it('refuses to open files outside the spreadsheet directory', async () => {
    const outside = path.join(mocks.tempDir, 'evil.xlsx')
    fs.writeFileSync(outside, 'x')
    expect(await openSpreadsheet(outside)).toBe('Invalid spreadsheet path')
    expect(await openSpreadsheet('/bin/sh')).toBe('Invalid spreadsheet path')
    expect(mocks.openPath).not.toHaveBeenCalled()
  })
})
