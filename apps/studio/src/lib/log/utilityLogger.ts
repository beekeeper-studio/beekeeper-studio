import log from 'electron-log/node';
import { redactMessage } from './redact';
import platformInfo from '@/common/platform_info';

const level = platformInfo.logLevel ?? 'warn';
log.logId = 'utility';
log.transports.console.level = level;
log.transports.file.level = level;
log.transports.file.fileName = 'utility.log';
log.variables.processType = 'UTILITY';
log.transports.console.format = '{h}:{i}:{s}.{ms} [{level}] [{processType}]{scope}›{text}';
log.errorHandler.setOptions({ showDialog: false });
log.hooks.push((message) => redactMessage(message));

export default log;
