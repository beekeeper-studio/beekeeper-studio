import rawLog from "@bksLogger";
import platformInfo from "@/common/platform_info";
import * as path from "path";
import { existsSync, readFileSync, copyFileSync, accessSync, constants } from "fs";
import { parseIni, processRawConfig } from "@/config/helpers";
import {
  BksConfigProvider,
  BksConfigSource,
  BksConfig,
} from "./BksConfigProvider";
import {
  checkUnrecognized,
  checkConflicts,
  checkDeprecations,
  collectConfigWarnings,
} from "./configValidation";

// The validators live in a node-free module so the config editor window can run
// them in the renderer. Re-exported here so existing importers keep working.
export { checkUnrecognized, checkConflicts, checkDeprecations, collectConfigWarnings };

export type ConfigFileName =
  | "default.config.ini"
  | "system.config.ini"
  | "user.config.ini"
  | "local.config.ini"
  | "deprecated.config.ini";

const log = rawLog.scope("BksConfig");

const bundledConfigPath = path.join(process.resourcesPath);

function copyBundledConfig(file: ConfigFileName, dest: string) {
  log.info(`Copying bundled config ${file} to ${dest}.`);
  const src = path.join(bundledConfigPath, file);
  if (!existsSync(src)) {
    throw new Error(
      `Bundled config file not found: ${src}. This should not happen. Please report an issue.`
    );
  }
  try {
    accessSync(dest, constants.W_OK);
    copyFileSync(src, dest);
  } catch (err) {
    log.warn(`Skipping copy of ${file}. Permission denied or dest not writable:`, err.message);
  }
}

function readConfig(filePath: string) {
  try {
    const config = parseIni(readFileSync(filePath, "utf-8"));
    log.debug(`Successfully read config ${filePath}.`);
    return processRawConfig(config);
  } catch (error) {
    log.error(`Failed reading config ${filePath}.`, error);
    throw error;
  }
}

/** The directory a machine-wide admin config lives in, or null if the platform
 * is unknown. Only meaningful outside of development. */
function resolveSystemConfigDir(): string | null {
  switch (platformInfo.platform) {
    case "mac":
      return "/Library/Application Support/beekeeper-studio";
    case "linux":
      return "/etc/beekeeper-studio";
    case "windows":
      return path.join(process.env.ProgramData || "C:\\ProgramData", "beekeeper-studio");
    default:
      return null;
  }
}

/**
 * Where a given config file is read from. Note this is not always where the
 * file is written: in production `default.config.ini` is read from the bundle
 * and only mirrored into the user directory for reference.
 */
export function resolveConfigFilePath(file: ConfigFileName): string | null {
  const isDev = platformInfo.isDevelopment || platformInfo.testMode;

  if (!isDev && file === "system.config.ini") {
    const dir = resolveSystemConfigDir();
    return dir ? path.join(dir, file) : null;
  }

  if (!isDev && (file === "default.config.ini" || file === "deprecated.config.ini")) {
    return path.join(bundledConfigPath, file);
  }

  return path.join(resolveConfigDir(), file);
}

/** The config file the user is allowed to edit. Differs in development. */
export function userConfigFileName(): ConfigFileName {
  return platformInfo.isDevelopment ? "local.config.ini" : "user.config.ini";
}

/** Paths the config editor needs. `system` is null when no admin config applies. */
export function getConfigFilePaths(): {
  default: string;
  user: string;
  system: string | null;
} {
  const systemPath = resolveConfigFilePath("system.config.ini");
  return {
    default: resolveConfigFilePath("default.config.ini"),
    // Always the user directory copy — never the bundle, which is read-only.
    user: path.join(resolveConfigDir(), userConfigFileName()),
    system: systemPath && existsSync(systemPath) ? systemPath : null,
  };
}

export function loadConfig(file: "default.config.ini"): IBksConfig;
export function loadConfig(file: Omit<ConfigFileName, "default.config.ini">): Partial<IBksConfig>;
export function loadConfig(file: ConfigFileName): IBksConfig | Partial<IBksConfig> {
  log.debug(`Loading config ${file}.`);

  const isDev = platformInfo.isDevelopment || platformInfo.testMode;
  const filePath = path.join(resolveConfigDir(), file);

  if (!isDev && file === "system.config.ini") {
    const systemConfigFilePath = resolveConfigFilePath(file);
    if (!systemConfigFilePath) {
      log.warn(`Failed loading system config. Unable to determine system config path. platform: ${platformInfo.platform}`);
      return {};
    }
    if (!existsSync(systemConfigFilePath)) {
      log.warn(`Failed loading system config. System config path not found: ${systemConfigFilePath}`);
      return {};
    }
    return readConfig(systemConfigFilePath);
  }

  if (!isDev && file === "default.config.ini") {
    // We always read the bundled version of default.config.ini and
    // system.config.ini so it's not possible for users to modify it. However,
    // we want to make sure they can read them for reference.
    copyBundledConfig(file, filePath);
    return readConfig(path.join(bundledConfigPath, file));
  }

  if (!isDev && file === "deprecated.config.ini") {
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
    return path.dirname(require.resolve('beekeeper-studio/package.json'));
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

export function mainBksConfig(): BksConfig {
  log.info(`Loading configs.`);

  const defaultConfig: IBksConfig = loadConfig("default.config.ini");
  const systemConfig: Partial<IBksConfig> = loadConfig("system.config.ini");
  const deprecatedConfig: Partial<IBksConfig> = loadConfig("deprecated.config.ini");
  let userConfig: Partial<IBksConfig> = {};
  try {
    userConfig = loadConfig(userConfigFileName());
  } catch (e) {
    log.warn(`Failed loading user config. Ignoring.`, e);
  }

  const warnings = collectConfigWarnings(
    defaultConfig,
    systemConfig,
    userConfig,
    deprecatedConfig
  );
  const source: BksConfigSource = {
    defaultConfig,
    systemConfig,
    userConfig,
    deprecatedConfig,
    warnings,
  };

  log.info(`Configs successfully loaded with ${warnings.length} warnings.`);
  if (warnings.length > 0) {
    log.warn("Warnings:", warnings);
  }
  log.info(`Default config: ${JSON.stringify(defaultConfig, null, 2)}`);
  log.info(`System config: ${JSON.stringify(systemConfig, null, 2)}`);
  log.info(`User config: ${JSON.stringify(userConfig, null, 2)}`);

  return BksConfigProvider.create(source, platformInfo);
}
