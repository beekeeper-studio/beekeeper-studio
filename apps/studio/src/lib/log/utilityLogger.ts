import log from 'electron-log/node'
import { redactMessage } from './redact'
import { resolveLogLevelsFromProcessEnv } from './logLevel'

export default function logger() {
  const levels = resolveLogLevelsFromProcessEnv()
  log.logId = 'utility';
  log.transports.console.level = levels.console;
  log.transports.file.level = levels.file;
  log.transports.file.fileName = "utility.log";
  log.variables.processType = 'UTILITY';
  log.transports.console.format = '{h}:{i}:{s}.{ms} [{processType}]{scope} › {text}'
  log.errorHandler.setOptions({ showDialog: false})
  log.hooks.push((message) => redactMessage(message))

  return log;
}

