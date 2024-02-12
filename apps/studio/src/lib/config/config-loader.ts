import ini from "ini";
import rawLog from "electron-log";
import platformInfo from "@/common/platform_info";
import * as path from "path";
import _ from "lodash";
import { existsSync, readFileSync, watch, writeFileSync } from "fs";
import {
  checkConfigWarnings,
  convertKeybinding,
  IniArray,
  isIniArray,
  parseIni,
  UserConfigWarning,
} from "./config-helper";

if (platformInfo.isDevelopment) {
  // run types builder
  require("../../../config-types-builder.js");
}

const DEFAULT_CONFIG_FILENAME = "default.config.ini";
const DEV_CONFIG_FILENAME = "local.config.ini";
const USER_CONFIG_FILENAME = "user.config.ini";

const log = rawLog.scope("config-loader");

type ConfigSource = "default" | "user";

export type KeybindingPath = DeepKeyOf<IBkConfig["keybindings"]>;

interface IBkConfigDebugInfo {
  path: string;
  value: string | undefined;
  source: ConfigSource;
  configs: {
    user: Partial<IBkConfig>;
    default: IBkConfig;
  };
}

export interface IBkConfigHandler extends IBkConfig {
  has: (path: string) => boolean;
  get: (path: string) => string | IniArray | undefined;
  set: (path: string, value: unknown) => void;
  debug: (path: string) => IBkConfigDebugInfo;
  debugAll: IBkConfigDebugInfo[];
  warnings: UserConfigWarning[];
  getKeybindings: (
    target: "electron" | "v-hotkey",
    path: KeybindingPath
  ) => string | string[] | undefined;
}

const defaultConfig = readConfigFile("default");
const userConfig = readConfigFile("user");
const mergedConfig = _.merge({}, defaultConfig, userConfig);
const configWarnings = checkConfigWarnings(defaultConfig, userConfig);

export const BkConfigHandler: IBkConfigHandler = {
  ...mergedConfig,
  has(path) {
    return !_.isNil(_.get(userConfig, path));
  },
  get(path) {
    const result = _.get(mergedConfig, path);
    if (result == null) {
      log.warn(`key not found: ${path}`);
    }
    return result;
  },
  set(path, value) {
    if (!this.has(path)) {
      log.warn(`key not found: ${path}`);
    }
    _.set(userConfig, path, ini.safe(value.toString()));
    writeUserConfigFile();
  },
  debug(path) {
    return {
      path,
      value: this.get(path) as string,
      source: this.has(path) ? "user" : "default",
      configs: {
        user: userConfig,
        default: defaultConfig,
      },
    };
  },
  get debugAll() {
    const getDebugAll = (obj: Record<string, any>, path = "") => {
      const result: IBkConfigDebugInfo[] = [];
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === "string") {
          result.push(
            this.debug(path ? `${path}.${key}` : key) as IBkConfigDebugInfo
          );
        } else {
          result.push(...getDebugAll(obj[key], path ? `${path}.${key}` : key));
        }
      });
      return result;
    };
    return getDebugAll(mergedConfig);
  },
  get warnings() {
    return configWarnings;
  },
  getKeybindings(target, path) {
    const keybindings = this.get(`keybindings.${path}`) as ReturnType<
      IBkConfigHandler["get"]
    >;

    if (isIniArray(keybindings)) {
      return Object.keys(keybindings).map((idx) =>
        convertKeybinding(target, keybindings[idx], platformInfo.platform)
      );
    }

    return convertKeybinding(target, keybindings, platformInfo.platform);
  },
};

function readConfigFile(type: "default"): IBkConfig;
function readConfigFile(type: "user"): Partial<IBkConfig>;
function readConfigFile(type: ConfigSource) {
  const filepath = resolveConfigType(type);

  log.debug("Reading user config", filepath);

  if (!existsSync(filepath)) {
    // Default config must exist
    if (type === "default") {
      throw new Error(`Config file ${filepath} does not exist.`);
    } else {
      return {};
    }
  }

  try {
    const parsed = parseIni(readFileSync(filepath, "utf-8"));
    log.debug(`Successfully read config ${filepath}`, parsed);
    return parsed;
  } catch (error) {
    log.debug(`Failed to read config ${filepath}`, error);
    throw error;
  }
}

function writeUserConfigFile() {
  try {
    log.debug("Writing user config", userConfig);
    writeFileSync(resolveConfigType("user"), ini.stringify(userConfig));
    log.info("Successfully wrote user config");
  } catch (error) {
    log.debug(`Failed to write user config`, error);
    throw error;
  }
}

function resolveRootPath() {
  const dirname = path.resolve(__dirname);
  if (dirname.includes("node_modules")) {
    return dirname.split("node_modules")[0];
  }
  return path.resolve(__dirname, "../../..");
}

function resolveConfigType(type: ConfigSource) {
  const configPath = platformInfo.isDevelopment
    ? resolveRootPath()
    : platformInfo.userDirectory;

  if (type === "default") {
    return path.join(configPath, DEFAULT_CONFIG_FILENAME);
  } else if (platformInfo.isDevelopment) {
    return path.join(configPath, DEV_CONFIG_FILENAME);
  } else {
    return path.join(configPath, USER_CONFIG_FILENAME);
  }
}

/** WARNING: Not optimized for production */
export function watchConfigFile(options: {
  type: ConfigSource;
  callback: () => void;
  errorCallback?: (error: Error) => void;
}) {
  const { type, callback, errorCallback } = options;

  const watcher = watch(resolveConfigType(type));

  watcher.on("change", async () => {
    callback();
  });

  watcher.on("error", (error) => {
    log.error(error);
    if (errorCallback) {
      errorCallback(error);
    }
  });

  return () => {
    watcher.close();
  };
}

export { BkConfigHandler as BkConfig };
