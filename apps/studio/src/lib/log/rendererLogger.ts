import log from 'electron-log/renderer';
import { redactMessage } from './redact';

log.transports.console.format = '{h}:{i}:{s}.{ms} [RENDERER]{scope} › {text}';
log.hooks.push((message) => redactMessage(message));
export default log;
