// This is for the camelCaseObjectKeys helper for cloud (connection import)
const _ = require('lodash')
if (!_.deepMapKeys) {
  _.mixin({
    deepMapKeys: function (obj, fn) {
      const x = {}
      _.forOwn(obj, function (rawV, k) {
        let v = rawV
        if (_.isPlainObject(v)) {
          v = _.deepMapKeys(v, fn)
        } else if (_.isArray(v)) {
          v = v.map((item) => _.deepMapKeys(item, fn))
        }
        x[fn(v, k)] = v
      })
      return x
    },
  })
}

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
