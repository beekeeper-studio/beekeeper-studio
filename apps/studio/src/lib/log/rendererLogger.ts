import log from 'electron-log/renderer';
import type { LogLevel } from 'electron-log';
import { redactMessage } from './redact';

// `process` isn't exposed in the renderer (context isolation, no node
// integration), so BKS_LOG_LEVEL / DEBUG can't be read here. Main owns the
// source of truth and pushes the resolved level via platformInfo after
// requestPlatformInfo() resolves. Until then, dev builds default to `info`
// (DevTools is most useful at that level), packaged builds to `warn`.
//
// `import.meta.env` is injected by Vite at build time; the global TS types
// don't know about it, so cast through unknown.
const viteEnv = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
const defaultLevel: LogLevel = viteEnv?.DEV ? 'info' : 'warn';

log.transports.console.level = defaultLevel;
// In v5 the ipc transport ships every message above its level to main; honour
// the same threshold so we don't pay the cost of serializing/IPC'ing messages
// the main process would drop anyway.
if (log.transports.ipc) {
  log.transports.ipc.level = defaultLevel;
}

// Tag every renderer message with processType so the console formatter
// (`{processType}`) prints `[RENDERER]` in the terminal stream when main
// relays IPC-bridged messages there.
log.variables.processType = 'RENDERER';
log.transports.console.format = '{h}:{i}:{s}.{ms} [{processType}]{scope} › {text}';
log.hooks.push((message) => redactMessage(message));

export default log;
