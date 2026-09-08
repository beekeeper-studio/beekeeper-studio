// Uint8Array hex/base64 methods, same polyfill set as src-commercial/entrypoints/renderer.ts
require('core-js/actual/typed-array/from-base64');
require('core-js/actual/typed-array/from-hex');
require('core-js/actual/typed-array/to-base64');
require('core-js/actual/typed-array/to-hex');

if (typeof global.document !== 'undefined') {
  global.document.createRange = () => ({
    setStart: () => undefined,
    setEnd: () => undefined,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    }),
    getClientRects: () => [],
    commonAncestorContainer: {
      nodeName: "BODY",
      ownerDocument: document,
    },
  });
}
