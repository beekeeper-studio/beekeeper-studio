import log from 'electron-log/main';
import path from 'path';
import { redactMessage } from './redact';
import platformInfo from '@/common/platform_info';

// platformInfo.logLevel is resolved once in mainPlatformInfo.ts and shared
// with utility (via env-serialized platformInfo) and renderer (via the
// platformInfo IPC). Falls back to 'warn' if the field is missing — should
// never happen in normal runs.
const level = platformInfo.logLevel ?? 'warn';
log.transports.console.level = level;
log.transports.file.level = level;
log.variables.processType = 'MAIN';
log.transports.console.format = '{h}:{i}:{s}.{ms} [{level}] [{processType}]{scope} › {text}';

// Renderer messages arrive via IPC and are processed by main's default
// logger; route them to renderer.log so the file split matches the
// [RENDERER] tag visible on the console.
log.transports.file.resolvePathFn = (vars, message) => {
  const processType = String(message?.variables?.processType ?? '').toLowerCase();
  const fileName = processType === 'renderer' ? 'renderer.log' : vars.fileName;
  return path.join(vars.libraryDefaultDir, fileName);
};

log.errorHandler.setOptions({ showDialog: false });
log.hooks.push((message) => redactMessage(message));

export default log;
