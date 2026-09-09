// Vitest twin of tests/init/env-setup.js. The fetch/TextEncoder/TextDecoder
// polyfills there exist for jest's jsdom environment; node 22 (and vitest's
// jsdom environment) provide all of them natively, so only the logger setup
// carries over.
import rawLog from 'electron-log/main'

rawLog.initialize()
rawLog.transports.console.level = 'debug'
