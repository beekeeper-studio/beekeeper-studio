import config from "../config";
import _ from "lodash";
import * as path from "path";
import ini from "ini";
import rawLog from "electron-log";
import { existsSync, readFileSync, watch, writeFileSync } from "fs";
import platformInfo from "../common/platform_info";
import { AppEvent } from "@/common/AppEvent";
import { ipcRenderer } from "electron";
import { transform } from "../../config-transformer";
import { VueConstructor } from "vue/types/umd";

export type ConfigSource = "default" | "user";

interface UserConfigWarning {
  type: "section" | "key";
  key: string;
}

interface DebugInfo {
  path: string;
  value: string | undefined;
  source: ConfigSource;
  configs: {
    user: Partial<IBkConfig>;
    default: IBkConfig;
  };
}

interface IBkConfigHandler extends IBkConfig {
  has: (path: string) => boolean;
  get: (path: string) => string | undefined;
  set: (path: string, value: unknown) => void;
  debug: (path: string) => DebugInfo;
  debugAll: DebugInfo[];
}

const log = rawLog.scope("ConfigPlugin");

const DEFAULT_CONFIG_FILENAME = "default.config.ini";
const DEV_CONFIG_FILENAME = "local.config.ini";
const USER_CONFIG_FILENAME = "user.config.ini";

function resolveConfigType(type: ConfigSource) {
  let configPath: string;

  if (platformInfo.isDevelopment) {
    configPath = path.join(
      path.resolve(__dirname).split("/node_modules")[0],
      "apps/studio"
    );
  } else {
    configPath = platformInfo.userDirectory;
  }

  if (type === "default") {
    return path.join(configPath, DEFAULT_CONFIG_FILENAME);
  } else if (platformInfo.isDevelopment) {
    return path.join(configPath, DEV_CONFIG_FILENAME);
  } else {
    return path.join(configPath, USER_CONFIG_FILENAME);
  }
}

export function readConfigFile(type: "default"): IBkConfig;
export function readConfigFile(type: "user"): Partial<IBkConfig>;
export function readConfigFile(type: ConfigSource) {
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
    const parsed = transform(ini.parse(readFileSync(filepath, "utf-8")));
    log.debug(`Successfully read config ${filepath}`, parsed);
    return parsed;
  } catch (error) {
    log.debug(`Failed to read config ${filepath}`, error);
    throw error;
  }
}

function writeUserConfigFile() {
  try {
    log.debug("Writing user config", BkConfigStore.userConfig);
    writeFileSync(
      resolveConfigType("user"),
      ini.stringify(BkConfigStore.userConfig)
    );
    log.info("Successfully wrote user config");
  } catch (error) {
    log.debug(`Failed to write user config`, error);
    throw error;
  }
}

function watchConfigFile(options: {
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

const BkConfigStore: {
  defaultConfig: IBkConfig;
  userConfig: Partial<IBkConfig>;
  mergedConfig: IBkConfig;
  userConfigWarnings: UserConfigWarning[];
} = {
  defaultConfig: {} as IBkConfig,
  userConfig: {},
  mergedConfig: {} as IBkConfig,
  userConfigWarnings: [],
};

function checkUserConfigWarnings() {
  const warnings: UserConfigWarning[] = [];

  for (const section in BkConfigStore.userConfig) {
    const hasSection = Object.prototype.hasOwnProperty.call(
      BkConfigStore.defaultConfig,
      section
    );

    if (!hasSection) {
      warnings.push({ type: "section", key: section });
      continue;
    }

    for (const key in BkConfigStore.userConfig[section]) {
      const hasKey = Object.prototype.hasOwnProperty.call(
        BkConfigStore.defaultConfig[section],
        key
      );

      if (!hasKey) {
        warnings.push({ type: "key", key: `${section}.${key}` });
      }
    }
  }
  return warnings;
}

/** is `path` in user config? */
const userConfigTester: IBkConfigHandler["has"] = (path) => {
  return !_.isNil(_.get(BkConfigStore.userConfig, path));
};

const configGetter: IBkConfigHandler["get"] = (path) => {
  return _.get(BkConfigStore.mergedConfig, path);
};

const userConfigSetter: IBkConfigHandler["set"] = (path, value) => {
  _.set(BkConfigStore.userConfig, path, ini.safe(value.toString()));
  writeUserConfigFile();
};

const configDebugger: IBkConfigHandler["debug"] = (path) => {
  return {
    path,
    value: configGetter(path),
    source: userConfigTester(path) ? "user" : "default",
    configs: {
      user: BkConfigStore.userConfig,
      default: BkConfigStore.defaultConfig,
    },
  };
};

const configDebuggerAll = (): IBkConfigHandler["debugAll"] => {
  const result = [];
  for (const section in BkConfigStore.mergedConfig) {
    for (const key in BkConfigStore.mergedConfig[section]) {
      result.push(configDebugger(`${section}.${key}`));
    }
  }
  return result;
};

export const BkConfigHandler = new Proxy(
  {},
  {
    get: function (_target, prop) {
      if (prop === "has") {
        return userConfigTester;
      }

      if (prop === "get") {
        return configGetter;
      }

      if (prop === "set") {
        return userConfigSetter;
      }

      if (prop === "debug") {
        return configDebugger;
      }

      if (prop === "debugAll") {
        return configDebuggerAll();
      }

      return configGetter(prop.toString());
    },
    set: function () {
      throw new Error(
        "Cannot set properties on BkConfigHandler. Please use .set instead."
      );
    },
  }
) as IBkConfigHandler;

const ctrlOrCmd = platformInfo.isMac ? "meta" : "ctrl";

// https://stackoverflow.com/a/66661477/10012118
// with little modifications
type DeepKeyOf<T> = (
  [T] extends [never]
    ? ""
    : T extends Record<string, any>
    ? {
        [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DeepKeyOf<T[K]>>}`;
      }[Exclude<keyof T, symbol>]
    : ""
) extends infer D
  ? Extract<D, string>
  : never;

type DotPrefix<T extends string> = T extends "" ? "" : `.${T}`;

function createKeymap(
  obj: Partial<Record<DeepKeyOf<IBkConfig["keybindings"]>, any>>
): Record<string, any> {
  const result = {};
  for (const path in obj) {
    configGetter(`keybindings.${path}`)
      .split(" or ")
      .forEach((keybinding) => {
        result[keybinding.replace(/ctrlorcmd/i, ctrlOrCmd)] = obj[path];
      });
  }
  return result;
}

export type createKeymapFunc = typeof createKeymap;

export default {
  install(Vue: VueConstructor) {
    BkConfigStore.defaultConfig = readConfigFile("default");
    BkConfigStore.userConfig = readConfigFile("user");
    BkConfigStore.userConfigWarnings = checkUserConfigWarnings();
    BkConfigStore.mergedConfig = _.merge(
      {},
      BkConfigStore.defaultConfig,
      BkConfigStore.userConfig
    );

    if (platformInfo.isDevelopment) {
      watchConfigFile({
        type: "default",
        callback: () => ipcRenderer.send(AppEvent.menuClick, "reload"),
      });

      watchConfigFile({
        type: "user",
        callback: () => ipcRenderer.send(AppEvent.menuClick, "reload"),
      });
    }

    Vue.prototype.$bkConfig = BkConfigHandler;
    Vue.prototype.$config = config;
    Vue.prototype.$createKeymap = createKeymap;
  },
};
