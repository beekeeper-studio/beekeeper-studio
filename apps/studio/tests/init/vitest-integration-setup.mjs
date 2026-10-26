// The localStorage stub just keeps src/config.ts happy in debug mode.
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {}
}
