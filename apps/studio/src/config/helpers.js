const cloneDeepWith = require("lodash/cloneDeepWith");
const toNumber = require("lodash/toNumber");
const ini = require("ini");

// https://stackoverflow.com/a/175787/10012118
function isNumeric(str) {
  if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
}

function parseIni(text) {
  const obj = ini.parse(text);
  return cloneDeepWith(obj, (value) => {
    if (isNumeric(value)) {
      return toNumber(value);
    }
  });
}

module.exports = {
  parseIni,
};
