// Logger setup. fetch/TextEncoder/TextDecoder need no polyfill: node 22 (and
// vitest's jsdom environment) provide them natively.
import rawLog from 'electron-log/main'

rawLog.initialize()
rawLog.transports.console.level = 'debug'
