// jest.polyfills.js
/**
 * @note The block below contains polyfills for Node.js globals
 * required for Jest to function when running JSDOM tests.
 * These HAVE to be require's and HAVE to be in this exact
 * order, since "undici" depends on the "TextEncoder" global API.
 *
 * Consider migrating to a more modern test runner if
 * you don't want to deal with this.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TextDecoder, TextEncoder } = require('util')
const rawLog = require('electron-log/main')

rawLog.initialize()
rawLog.transports.console.level = 'debug'


globalThis.fetch = require('node-fetch')
// eslint-disable-next-line no-undef
Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
})
