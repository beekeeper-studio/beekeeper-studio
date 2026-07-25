import _ from "lodash";
import type { ConfigEntryDetailWarning } from "./BksConfigProvider";
import globals from "@/common/globals";

// This module is deliberately free of node built-ins (fs, path) so it can be
// imported from the renderer as well as the main process. The config editor
// window runs these checks on every keystroke, entirely in the renderer.

/**
 * Check any config keys from `newConfig` that we don't recognize based on
 * `defaultConfig`.
 **/
export function checkUnrecognized(
  defaultConfig: IBksConfig,
  newConfig: Partial<IBksConfig>,
  deprecated: Partial<IBksConfig>,
  sourceName: "system" | "user"
): ConfigEntryDetailWarning[] {
  const results: ConfigEntryDetailWarning[] = [];

  function traverse(obj: Record<string, any>, parentPath = "") {
    for (const key of Object.keys(obj)) {
      const path = parentPath ? `${parentPath}.${key}` : key;

      // Skip validation for plugin configurations (plugins and plugins.[plugin-id])
      if (path === 'plugins' || /^plugins\.[^.]+/.test(path)) {
        continue;
      }

      const unrecognized = !_.has(defaultConfig, path) && !_.has(deprecated, path);
      const value = obj[key];

      if (unrecognized) {
        const section = typeof value === "object" ? path : parentPath;
        results.push({
          type: "unrecognized-key",
          sourceName,
          section,
          path,
        });
      } else if (typeof value === "object" && !Array.isArray(value)) {
        traverse(value, path);
      }
    }
  }

  traverse(newConfig);

  // Validate that pluginSystem.allow only contains known bundled plugin IDs
  const allow = _.get(newConfig, "pluginSystem.allow") as string[] | undefined;
  if (Array.isArray(allow)) {
    const bundledPluginIds = globals.plugins.ensureInstalled.map((p) => p.id);
    for (const id of allow) {
      if (!bundledPluginIds.includes(id)) {
        results.push({
          type: "unknown-allow-plugin",
          sourceName,
          section: "pluginSystem",
          path: "pluginSystem.allow",
          value: id,
        });
      }
    }
  }

  return results;
}

/** Check if any config keys from `source` conflict with `target`. **/
export function checkConflicts(
  source: Partial<IBksConfig>,
  target: Partial<IBksConfig>,
  sourceName: "system" | "user"
): ConfigEntryDetailWarning[] {
  const results: ConfigEntryDetailWarning[] = [];

  function traverse(obj: Record<string, any>, parentPath = "") {
    for (const key of Object.keys(obj)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const value = obj[key];
      if (typeof value === "object" && !Array.isArray(value)) {
        traverse(value, path);
      } else if (_.has(target, path)) {
        results.push({
          type: "system-user-conflict",
          sourceName,
          section: parentPath,
          path,
        });
      }
    }
  }

  traverse(source);

  return results;
}

export function checkDeprecations(
  config: Partial<IBksConfig>,
  deprecations: Partial<IBksConfig>,
  sourceName: "system" | "user"
): ConfigEntryDetailWarning[] {
  const results: ConfigEntryDetailWarning[] = [];

  function traverse(obj: Record<string, any>, parentPath = "") {
    for (const key of Object.keys(obj)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const value = obj[key];
      if (typeof value === "object" && !Array.isArray(value)) {
        traverse(value, path);
      } else if (_.has(config, path)) {
        results.push({
          type: "deprecated-key",
          sourceName,
          section: parentPath,
          path,
          value
        });
      }
    }
  }

  traverse(deprecations);

  return results;
}

export function collectConfigWarnings(
  defaultConfig: IBksConfig,
  systemConfig: Partial<IBksConfig>,
  userConfig: Partial<IBksConfig>,
  deprecatedConfig: Partial<IBksConfig>
): ConfigEntryDetailWarning[] {
  const systemConfigWarnings = checkUnrecognized(
    defaultConfig,
    systemConfig,
    deprecatedConfig,
    "system"
  );
  const userConfigWarnings = checkUnrecognized(
    defaultConfig,
    userConfig,
    deprecatedConfig,
    "user"
  );
  const systemUserConflicts = checkConflicts(userConfig, systemConfig, "user");
  const userDeprecations = checkDeprecations(userConfig, deprecatedConfig, "user");
  const systemDeprecations = checkDeprecations(systemConfig, deprecatedConfig, "system");

  return systemConfigWarnings.concat(
    userConfigWarnings,
    systemUserConflicts,
    userDeprecations,
    systemDeprecations
  );
}
