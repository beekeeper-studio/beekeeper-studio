import log from 'electron-log/main';
import { redactMessage } from './redact'

export default function logger() {
  log.transports.console.level = 'info'
  log.transports.file.level = "silly"
  log.transports.console.format = '{h}:{i}:{s}.{ms} [MAIN]{scope} › {text}'
  log.errorHandler.setOptions({ showDialog: false})
  log.hooks.push((message) => redactMessage(message))

  return log;
}
