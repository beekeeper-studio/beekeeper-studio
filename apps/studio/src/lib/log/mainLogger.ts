import log from 'electron-log/main';
import path from 'path';
import { redactMessage } from './redact';
import { resolveLevel } from './logLevel';

const level = resolveLevel();
log.transports.console.level = level;
log.transports.file.level = level;
// processType tags lines in the terminal so a single console stream is
// unambiguous; renderer messages arriving over IPC carry their own
// processType, so the [MAIN] default here only applies to main-originated
// lines.
log.variables.processType = 'MAIN';
log.transports.console.format = '{h}:{i}:{s}.{ms} [{processType}]{scope} › {text}';

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
