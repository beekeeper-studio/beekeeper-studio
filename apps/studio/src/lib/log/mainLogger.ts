import log from 'electron-log/main';
import path from 'path';
import { redactMessage } from './redact';
import { cliArgsFromProcessArgv } from '@/cli/args';

// we set these in main.ts later, becuase we don't have access to platformInfo here.
// `beekeeper-studio cli ...` prints its result on stdout, so in that mode the
// console transport is off from the first line: modules log while they load,
// long before main.ts gets a chance to quiet them.
log.transports.console.level = cliArgsFromProcessArgv() ? false : 'silly';
log.transports.file.level = 'warn';
log.variables.processType = 'MAIN';
log.transports.console.format = '{h}:{i}:{s}.{ms} [{level}] [{processType}]{scope}›{text}';

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
