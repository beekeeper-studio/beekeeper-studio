// Replaces the `globals` block of jest.integration.config.js. `fetch` is native
// on node 22; the localStorage stub just keeps src/config.ts happy in debug mode.
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {}
}
