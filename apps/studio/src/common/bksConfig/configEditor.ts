import _ from "lodash";

/** Raw contents of the config files, as handed to the config editor window. */
export interface ConfigFileContents {
  defaultText: string;
  userText: string;
  userPath: string;
  /** Null when no machine-wide admin config applies. */
  systemPath: string | null;
}

export interface ConfigKeyDefinition {
  section: string;
  key: string;
  defaultValue?: string;
}

function describeValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/**
 * Flatten the parsed default config into the `[section] key` pairs the editor
 * offers as completions. Sections are dotted, matching the INI file, so
 * `{ ui: { general: { save } } }` becomes `[ui.general] save`.
 *
 * `db.default` is expanded into per-database sections at load time, so those
 * generated sections are skipped: suggesting all fifteen of them would bury the
 * keys anyone actually types.
 */
export function flattenConfigKeys(
  defaultConfig: Record<string, any>
): ConfigKeyDefinition[] {
  const results: ConfigKeyDefinition[] = [];

  function traverse(obj: Record<string, any>, section: string) {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const path = section ? `${section}.${key}` : key;

      if (_.isPlainObject(value)) {
        traverse(value, path);
      } else {
        results.push({
          section,
          key,
          defaultValue: describeValue(value),
        });
      }
    }
  }

  traverse(defaultConfig, "");

  return _.uniqBy(results, (r) => `${r.section}.${r.key}`);
}
