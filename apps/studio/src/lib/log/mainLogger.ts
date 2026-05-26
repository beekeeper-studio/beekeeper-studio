import log from 'electron-log/main';
import { redactMessage } from './redact'
import { resolveLogLevels } from './logLevel'

export default function logger() {
  const levels = resolveLogLevels()
  log.transports.console.level = levels.console
  log.transports.file.level = levels.file
  // processType is a per-logger variable; the format substitutes it via the
  // {processType} placeholder. Renderer messages arriving over IPC carry their
  // own processType, so this default only applies to messages logged here.
  log.variables.processType = 'MAIN'
  log.transports.console.format = '{h}:{i}:{s}.{ms} [{processType}]{scope} › {text}'
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] [{processType}]{scope} {text}'
  log.errorHandler.setOptions({ showDialog: false})
  log.hooks.push((message) => redactMessage(message))

  return log;
}
