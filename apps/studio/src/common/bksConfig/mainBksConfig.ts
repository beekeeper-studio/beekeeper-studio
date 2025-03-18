import rawLog from "@bksLogger";
import platformInfo from "@/common/platform_info";
import * as path from "path";
import _ from "lodash";
import { existsSync, readFileSync, copyFileSync } from "fs";
import { parseIni } from "../../../src/config/helpers";
import {
  BksConfigProvider,
  ConfigEntryDetailWarning,
  BksConfigSource,
  BksConfig,
} from "./BksConfigProvider";

type ConfigFileName =
  | "default.config.ini"
  | "system.config.ini"
  | "user.config.ini"
  | "local.config.ini";

const log = rawLog.scope("BksConfig");

/**
 * Check any config keys from `newConfig` that we don't recognize based on
 * `defaultConfig`.
 **/
export function checkUnrecognized(
  defaultConfig: IBksConfig,
  newConfig: Partial<IBksConfig>,
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
  source: Partial<IBksConfig>,
  target: Partial<IBksConfig>,
  sourceName: "system" | "user"
): ConfigEntryDetailWarning[] {
  const results: ConfigEntryDetailWarning[] = [];

  function traverse(obj: Record<string, any>, parentPath = "") {
    for (const key of Object.keys(obj)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const value = obj[key];
      if (typeof value === "object") {
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

const bundledConfigPath = path.join(process.resourcesPath);

function copyBundledConfig(file: ConfigFileName, dest: string) {
  log.info(`Copying bundled config ${file} to ${dest}.`);
  const src = path.join(bundledConfigPath, file);
  if (!existsSync(src)) {
    throw new Error(
      `Bundled config file not found: ${src}. This should not happen. Please report an issue.`
    );
  }
  copyFileSync(src, dest);
}

function readConfig(filePath: string) {
  try {
    const config = parseIni(readFileSync(filePath, "utf-8"));
    log.debug(`Successfully read config ${filePath}.`);
    return config;
  } catch (error) {
    log.error(`Failed reading config ${filePath}.`, error);
    throw error;
  }
}

export function loadConfig(file: ConfigFileName): IBksConfig {
  log.debug(`Loading config ${file}.`);

  const isDev = platformInfo.isDevelopment || platformInfo.testMode;
  const filePath = path.join(resolveConfigDir(), file);

  if (
    !isDev &&
    (file === "default.config.ini" || file === "system.config.ini")
  ) {
    // We always read the bundled version of default.config.ini and
    // system.config.ini so it's not possible for users to modify it. However,
    // we want to make sure they can read them for reference.
    copyBundledConfig(file, filePath);
    return readConfig(path.join(bundledConfigPath, file));
  }

  if (!existsSync(filePath)) {
    if (isDev) {
      throw new Error(`Failed loading config. File not found: ${filePath}`);
    }
    copyBundledConfig(file, filePath);
  }

  return readConfig(filePath);
}

function resolveConfigDir() {
  const dirpath = path.resolve(__dirname);

  if (platformInfo.testMode) {
    return path.resolve(dirpath, "../../..");
  }

  if (!platformInfo.isDevelopment) {
    return platformInfo.userDirectory;
  }

  if (dirpath.includes("node_modules")) {
    return dirpath.split("node_modules")[0];
  }

  if (process.env.CLI_MODE) {
    return path.resolve(dirpath);
  }

  return path.resolve(__dirname, "..");
}

function collectConfigWarnings(
  defaultConfig: IBksConfig,
  systemConfig: Partial<IBksConfig>,
  userConfig: Partial<IBksConfig>
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
  const systemUserConflicts = checkConflicts(userConfig, systemConfig, "user");
  const warnings = systemConfigWarnings.concat(
    userConfigWarnings,
    systemUserConflicts
  );
  return warnings;
}

export function mainBksConfig(): BksConfig {
  log.info(`Loading configs.`);

  const defaultConfig: IBksConfig = loadConfig("default.config.ini");
  const systemConfig: Partial<IBksConfig> = loadConfig("system.config.ini");
  const userConfig: Partial<IBksConfig> = loadConfig(
    platformInfo.isDevelopment ? "local.config.ini" : "user.config.ini"
  );

  const warnings = collectConfigWarnings(
    defaultConfig,
    systemConfig,
    userConfig
  );
  const source: BksConfigSource = {
    defaultConfig,
    systemConfig,
    userConfig,
    warnings,
  };

  log.info(`Configs successfully loaded with ${warnings.length} warnings.`);
  log.warn("Warnings:", warnings);
  log.info(`Default config: ${JSON.stringify(defaultConfig, null, 2)}`);
  log.info(`System config: ${JSON.stringify(systemConfig, null, 2)}`);
  log.info(`User config: ${JSON.stringify(userConfig, null, 2)}`);

  return BksConfigProvider.create(source, platformInfo);
}
