import log from 'electron-log/main';
import path from 'path';
import { redactMessage } from './redact';
import { resolveLevel } from './logLevel';

// Main is the origin of the log level — mainPlatformInfo bakes the same
// resolveLevel() result into platformInfo so utility (via env-serialized
// platformInfo) and renderer (via IPC platformInfo) pick up the same value.
// We can't pull platformInfo here directly because this module is also
// bundled into preload, where importing platform_info throws by design.
const level = resolveLevel();
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
