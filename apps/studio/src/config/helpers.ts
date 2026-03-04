import ini from "ini";
import _ from "lodash";
import { DatabaseTypes } from "../lib/db/types";

// https://stackoverflow.com/a/175787/10012118
function isNumeric(str: unknown): boolean {
  if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str as unknown as number) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
}

function parseIni(text: string): Record<string, unknown> {
  const obj = ini.parse(text);
  return _.cloneDeepWith(obj, (value) => {
    if (isNumeric(value)) {
      return _.toNumber(value);
    }
  });
}

function populateDefaults(config: Record<string, unknown>, parentPath: string, defaultPath: string): void {
  const defaultObj = _.get(config, defaultPath) as Record<string, unknown> | undefined;
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

function processRawConfig(config: Record<string, unknown>): Record<string, unknown> {
  const dbObj = config.db as Record<string, unknown> | undefined;

  if (dbObj && _.has(dbObj, "default")) {
    // this sanitizes the defaults before we set them for all other dbs (ie [ '' ] => [])
    populateDefaults(config, `db.default_parsed`, 'db.default')
    config.db = { ...dbObj, default: (config.db as Record<string, unknown>).default_parsed, default_parsed: undefined };
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
