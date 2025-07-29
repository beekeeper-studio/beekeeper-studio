import ini from "ini";
import _ from "lodash";
import { DatabaseTypes } from "../lib/db/types.ts"

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
  return _.cloneDeepWith(obj, (value) => {
    if (isNumeric(value)) {
      return _.toNumber(value);
    }
  });
}

function processRawConfig(config) {
  const dbObj = config.db;

  if (dbObj && _.has(dbObj, "default")) {
    const defaultObj = dbObj.default;
    for (const d of DatabaseTypes) {
      const section = d === "postgresql" ? "postgres" : d;
      if (!dbObj[section]) {
        dbObj[section] = {}
      }
      for (const key of Object.keys(defaultObj)) {
        const value = dbObj[section][key];
        if (value === undefined || value === null) {
          config["db"][section][key] = defaultObj[key];
        }
      }
    }
  }

  return config;
}

export {
  parseIni,
  processRawConfig
};
