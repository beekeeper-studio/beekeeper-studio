import log from 'electron-log/main';

export default function logger() {
  log.transports.console.level = 'info'
  log.transports.file.level = "info"
  log.transports.console.format = '{h}:{i}:{s}.{ms} [MAIN]{scope} › {text}'
  log.errorHandler.setOptions({ showDialog: false})

  return log;
}
