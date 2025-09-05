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

function populateDefaults(config, parentPath, defaultPath) {
  const defaultObj = _.get(config, defaultPath)
  if (!defaultObj) {
    throw new Error(`Failed to retrieve default object for key path: ${defaultPath}`)
  }
  for (const key of Object.keys(defaultObj)) {
    const value = _.get(config, `${parentPath}.${key}`);
    let defaultValue = defaultObj[key]
    if (_.isObject(defaultValue) && !_.isArray(defaultValue)) {
      populateDefaults(config, `${parentPath}.${key}`, `${defaultPath}.${key}`)
    } else if (value === undefined || value === null) {
      if (_.isString(defaultValue) && defaultValue.length === 0) {
        defaultValue = null
      }

      // This allows us to have empty arrays, as the ini parser when writing something like `value[] =`
      // actually parses it as [ '' ] ie an array with one element (the empty string)
      if (_.isArray(defaultValue) && defaultValue.length > 0 && _.isString(defaultValue[0])) {
        defaultValue = defaultValue.filter((v) => v.length > 0)
      }
      _.set(config, `${parentPath}.${key}`, defaultValue)
    }

  }
}

function processRawConfig(config) {
  const dbObj = config.db;

  if (dbObj && _.has(dbObj, "default")) {
    const defaultObj = dbObj.default;
    for (const d of DatabaseTypes) {
      const section = d === "postgresql" ? "postgres" : d;
      populateDefaults(config, `db.${section}`, "db.default")
    }
  }

  return config;
}

export {
  parseIni,
  processRawConfig
};
