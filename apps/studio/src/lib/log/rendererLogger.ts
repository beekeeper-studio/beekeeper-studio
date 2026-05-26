import log from 'electron-log/renderer';
import { redactMessage } from './redact';
import { resolveLogLevels } from './logLevel';

const levels = resolveLogLevels();
log.transports.console.level = levels.console;
// In v5 the ipc transport ships every message above its level to main; honour
// the same threshold so we don't pay the cost of serializing/IPC'ing messages
// that the main process would drop anyway.
if (log.transports.ipc) {
  log.transports.ipc.level = levels.file;
}
// Tag every renderer message with processType=RENDERER so the main-process
// file formatter (`{processType}`) writes `[RENDERER]` instead of `[MAIN]`
// when it relays our IPC-bridged messages to disk.
log.variables.processType = 'RENDERER';
log.transports.console.format = '{h}:{i}:{s}.{ms} [{processType}]{scope} › {text}';
log.hooks.push((message) => redactMessage(message));
export default log;
