import log from 'electron-log/renderer';
import { redactMessage } from './redact';
import { resolveLogLevels } from './logLevel';

// In the renderer, `process` isn't exposed (context isolation, no node
// integration), and BKS_LOG_LEVEL / DEBUG live in the host process's env —
// they can't be read here. Detect dev mode through Vite's statically-
// replaced `import.meta.env.DEV` and let the main process handle env-var
// overrides on its own side (they still control what reaches the file).
//
// `import.meta.env` is injected by Vite at build time; the global TS types
// don't know about it, so cast through unknown.
const viteEnv = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
const levels = resolveLogLevels({
  isDevelopment: !!viteEnv?.DEV,
});
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
