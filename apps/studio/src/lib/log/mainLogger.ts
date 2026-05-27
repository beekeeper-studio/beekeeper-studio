import log from 'electron-log/main';
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
  log.errorHandler.setOptions({ showDialog: false})
  log.hooks.push((message) => redactMessage(message))

  return log;
}
