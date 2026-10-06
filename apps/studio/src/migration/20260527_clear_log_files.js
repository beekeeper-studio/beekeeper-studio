import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import rawLog from '@bksLogger'

// One-time scrub of any sensitive data that ended up in log files before the
// redacter was wired up. No schema change — this migration truncates the
// known log files and removes rotated *.old.log artifacts (the shared file
// transport rotates `foo.log` → `foo.old.log`). Each operation is wrapped
// so one failure (missing file, permission denied, locked file) doesn't
// skip the others.
const log = rawLog.scope('migration:clear-log-files')

const LOG_FILES = ['main.log', 'utility.log', 'renderer.log']

function clearMainTransportFile() {
  try {
    const file = rawLog.transports.file.getFile()
    if (file && typeof file.clear === 'function') {
      file.clear()
    }
  } catch (e) {
    log.warn('Failed to clear main file transport via the shared logger:', e)
  }
}

function truncate(filePath) {
  try {
    if (!fs.existsSync(filePath)) return
    fs.writeFileSync(filePath, '')
  } catch (e) {
    log.warn(`Failed to truncate ${filePath}:`, e)
  }
}

function unlinkRotatedFile(filePath) {
  try {
    fs.unlinkSync(filePath)
  } catch (e) {
    log.warn(`Failed to delete ${filePath}:`, e)
  }
}

function resolveLogsDir() {
  try {
    return app.getPath('logs')
  } catch (e) {
    log.warn('Failed to resolve logs directory via app.getPath:', e)
    return null
  }
}

export default {
  name: '20260527_clear_log_files',
  async run() {
    clearMainTransportFile()

    const logsDir = resolveLogsDir()
    if (!logsDir) return

    for (const name of LOG_FILES) {
      truncate(path.join(logsDir, name))
    }

    let entries = []
    try {
      entries = fs.readdirSync(logsDir)
    } catch (e) {
      log.warn(`Failed to list ${logsDir}:`, e)
      return
    }

    for (const entry of entries) {
      if (entry.endsWith('.old.log')) {
        unlinkRotatedFile(path.join(logsDir, entry))
      }
    }
  },
}
