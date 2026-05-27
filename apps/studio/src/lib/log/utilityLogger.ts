import log from 'electron-log/node';
import { redactMessage } from './redact';
import { resolveLevel } from './logLevel';

const level = resolveLevel();
log.logId = 'utility';
log.transports.console.level = level;
log.transports.file.level = level;
log.transports.file.fileName = 'utility.log';
log.variables.processType = 'UTILITY';
log.transports.console.format = '{h}:{i}:{s}.{ms} [{level}] [{processType}]{scope} › {text}';
log.errorHandler.setOptions({ showDialog: false });
log.hooks.push((message) => redactMessage(message));

export default log;
