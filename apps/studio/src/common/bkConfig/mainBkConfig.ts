import rawLog from "@bksLogger";
import platformInfo from "@/common/platform_info";
import * as path from "path";
import _ from "lodash";
import { existsSync, readFileSync } from "fs";
// @ts-expect-error
import { parseIni } from "../../../typesGenerator.mjs";
import {
  BkConfigProvider,
  ConfigEntryDetailWarning,
  BkConfigSource,
  BkConfig,
} from "./BkConfigProvider";

const log = rawLog.scope("BkConfig");

/**
 * Check any config keys from `newConfig` that we don't recognize based on
 * `defaultConfig`.
 **/
export function checkUnrecognized(
  defaultConfig: IBkConfig,
  newConfig: Partial<IBkConfig>,
  sourceName: "system" | "user"
): ConfigEntryDetailWarning[] {
  const results: ConfigEntryDetailWarning[] = [];

  function traverse(obj: Record<string, any>, parentPath = "") {
    for (const key of Object.keys(obj)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const unrecognized = !_.has(defaultConfig, path);
      const value = obj[key];

      if (unrecognized) {
        const section = typeof value === "object" ? path : parentPath;
        results.push({
          type: "unrecognized-key",
          sourceName,
          section,
          path,
        });
      } else if (typeof value === "object") {
        traverse(value, path);
      }
    }
  }

  traverse(newConfig);

  return results;
}

/** Check if any config keys from `source` conflict with `target`. **/
export function checkConflicts(
  source: Partial<IBkConfig>,
  target: Partial<IBkConfig>,
  sourceName: "system" | "user"
): ConfigEntryDetailWarning[] {
  const results: ConfigEntryDetailWarning[] = [];

  function traverse(obj: Record<string, any>, parentPath = "") {
    for (const key of Object.keys(obj)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const value = obj[key];
      if (typeof value === "object") {
        traverse(value, path);
      } else if (_.has(source, path)) {
        results.push({
          type: "system-user-conflict",
          sourceName,
          section: parentPath,
          path,
        });
      }
    }
  }

  traverse(target);

  return results;
}

export function loadConfig(filePath: string) {
  log.debug(`Loading config ${filePath}.`);

  if (!existsSync(filePath)) {
    throw new Error(`Failed loading config. File not found: ${filePath}.`);
  }

  try {
    log.debug(`Reading config ${filePath}.`);
    const config = parseIni(readFileSync(filePath, "utf-8"));
    log.debug("Config successfully read.");
    return config;
  } catch (error) {
    log.error(`Failed reading config ${filePath}.`, error);
    throw error;
  }
}

function resolveConfigDir() {
  if (!platformInfo.isDevelopment) {
    return platformInfo.userDirectory;
  }

  const dirpath = path.resolve(__dirname);

  if (dirpath.includes("node_modules")) {
    return dirpath.split("node_modules")[0];
  }

  if (process.env.CLI_MODE) {
    return path.resolve(dirpath, "../..");
  }

  if (platformInfo.testMode) {
    return path.resolve(dirpath, "../../../..");
  }

  return path.resolve(__dirname, "../../..");
}

function loadConfigs(dir: string) {
  const defaultConfig: IBkConfig = loadConfig(
    path.join(dir, "default.config.ini")
  );
  const systemConfig: Partial<IBkConfig> = loadConfig(
    path.join(dir, "system.config.ini")
  );
  const userConfig: Partial<IBkConfig> = loadConfig(
    path.join(
      dir,
      platformInfo.isDevelopment ? "local.config.ini" : "user.config.ini"
    )
  );
  return { defaultConfig, systemConfig, userConfig };
}

function collectConfigWarnings(
  defaultConfig: IBkConfig,
  systemConfig: Partial<IBkConfig>,
  userConfig: Partial<IBkConfig>
) {
  const systemConfigWarnings = checkUnrecognized(
    defaultConfig,
    systemConfig,
    "system"
  );
  const userConfigWarnings = checkUnrecognized(
    defaultConfig,
    userConfig,
    "user"
  );
  const systemUserConflicts = checkConflicts(systemConfig, userConfig, "user");
  const warnings = systemConfigWarnings.concat(
    userConfigWarnings,
    systemUserConflicts
  );
  return warnings;
}

export function mainBkConfig(): BkConfig {
  const configDir = resolveConfigDir();
  log.info(`Loading configs from ${configDir}.`);
  const { defaultConfig, systemConfig, userConfig } = loadConfigs(configDir);
  const warnings = collectConfigWarnings(
    defaultConfig,
    systemConfig,
    userConfig
  );
  const source: BkConfigSource = {
    configDir,
    defaultConfig,
    systemConfig,
    userConfig,
    warnings,
  };

  log.info(
    `Configs successfully loaded with ${warnings.length} warnings conflicts.`
  );
  log.warn("Warnings:", warnings);
  log.info(`Default config: ${JSON.stringify(defaultConfig, null, 2)}`);
  log.info(`System config: ${JSON.stringify(systemConfig, null, 2)}`);
  log.info(`User config: ${JSON.stringify(userConfig, null, 2)}`);

  return BkConfigProvider.create(source, platformInfo);
}
