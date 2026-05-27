import log from 'electron-log/main';
import path from 'path';
import { redactMessage } from './redact'
import { resolveLogLevelsFromProcessEnv } from './logLevel'

export default function logger() {
  const levels = resolveLogLevelsFromProcessEnv()
  log.transports.console.level = levels.console
  log.transports.file.level = levels.file
  // processType tags lines in the terminal so a single console stream is
  // unambiguous; renderer messages arriving over IPC carry their own
  // processType, so the [MAIN] default here only applies to main-originated
  // lines.
  log.variables.processType = 'MAIN'
  log.transports.console.format = '{h}:{i}:{s}.{ms} [{processType}]{scope} › {text}'
  // Route messages to per-process log files (main.log, renderer.log) based on
  // the message's processType variable. Main owns the only file transport
  // that renderer-side messages reach (they arrive via IPC and are processed
  // by main's default logger), so this is where the split has to happen.
  // Without it every renderer log lands in main.log.
  log.transports.file.resolvePathFn = (vars, message) => {
    const processType = String(message?.variables?.processType ?? '').toLowerCase()
    const fileName = processType === 'renderer' ? 'renderer.log' : vars.fileName
    return path.join(vars.libraryDefaultDir, fileName)
  }
  log.errorHandler.setOptions({ showDialog: false})
  log.hooks.push((message) => redactMessage(message))

  return log;
}
