import log from 'electron-log/renderer';

log.transports.console.format = '{h}:{i}:{s}.{ms} [RENDERER]{scope} › {text}';
export default log;
