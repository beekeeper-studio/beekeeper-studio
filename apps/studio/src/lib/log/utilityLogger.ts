import log from 'electron-log/node'

export default function logger() {
  log.logId = 'utility';
  log.transports.console.level = 'silly';
  log.transports.file.level = "silly";
  log.transports.file.fileName = "utility.log";
  // log.transports.file.resolvePathFn = () => __dirname + "/utility.log";
  log.transports.console.format = '{h}:{i}:{s}.{ms} [UTILITY]{scope} {text}'
  log.errorHandler.setOptions({ showDialog: false})

  return log;
}

