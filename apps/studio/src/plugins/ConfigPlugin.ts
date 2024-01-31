import config from "../config";
import _ from "lodash";
import * as path from "path";
import ini from "ini";
import rawLog from "electron-log";
import { existsSync, readFileSync, watch, writeFileSync } from "fs";
import platformInfo from "../common/platform_info";
import { AppEvent } from "@/common/AppEvent";
import { ipcRenderer } from "electron";

export type ConfigType = "default" | "user";

const log = rawLog.scope("config_manager");

const DEFAULT_CONFIG_FILENAME = "default.config.ini";
const DEV_CONFIG_FILENAME = "local.config.ini";
const USER_CONFIG_FILENAME = "user.config.ini";

function resolveConfigType(type: ConfigType) {
  let configPath: string;

  if (platformInfo.isDevelopment) {
    configPath = path.resolve(__dirname).split("/node_modules")[0];
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

async function readConfigFile(type: ConfigType) {
  return new Promise((resolve, reject) => {
    const filepath = resolveConfigType(type);

    log.debug("Reading user config", filepath);

    if (!existsSync(filepath)) {
      // Default config must exist
      if (type === "default") {
        reject(new Error(`Config file ${filepath} does not exist.`));
      } else {
        resolve({});
      }
      return;
    }

    try {
      const parsed = ini.parse(readFileSync(filepath, "utf-8"));
      log.debug(`Successfully read config ${filepath}`, parsed);
      resolve(parsed);
    } catch (error) {
      log.debug(`Failed to read config ${filepath}`, error);
      reject(error);
    }
  });
}

async function writeUserConfigFile() {
  return new Promise<void>((resolve, reject) => {
    try {
      log.debug("Writing user config", BkConfigStore.userConfig);
      writeFileSync(
        resolveConfigType("user"),
        ini.stringify(BkConfigStore.userConfig)
      );
      log.info("Successfully wrote user config");
      resolve();
    } catch (error) {
      log.debug(`Failed to write user config`, error);
      reject(error);
    }
  });
}

function watchConfigFile(options: {
  type: ConfigType;
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

const BkConfigStore = {
  defaultConfig: {},
  userConfig: {},
  userConfigWarnings: [],
};

function configTester(path: string) {
  return !_.isNil(_.at(BkConfigStore.userConfig, path));
}

function configGetter(path: string) {
  return (
    _.get(BkConfigStore.userConfig, path) ??
    _.get(BkConfigStore.defaultConfig, path)
  );
}

function configSetter(path: string, value: unknown) {
  _.set(BkConfigStore.userConfig, path, value);
  writeUserConfigFile().catch(log.error);
}

function checkUserConfigWarnings() {
  const warnings: {
    type: "section" | "key";
    key: string;
  }[] = [];
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

const BkConfigHandler = new Proxy(BkConfigStore, {
  get: function (_, prop) {
    if (prop === "has") {
      return configTester;
    }
    if (prop === "get") {
      return configGetter;
    }
    if (prop === "set") {
      return configSetter;
    }
    return configGetter(prop.toString());
  },
  set: function () {
    throw new Error(
      "Cannot set properties on BkConfigHandler. Please use .set instead."
    );
  },
});

export { BkConfigHandler as BkConfig };

export default {
  async install(Vue: any) {
    BkConfigStore.defaultConfig = await readConfigFile("default");
    BkConfigStore.userConfig = await readConfigFile("user");
    BkConfigStore.userConfigWarnings = checkUserConfigWarnings();

    if (platformInfo.isDevelopment) {
      watchConfigFile({
        type: "default",
        callback: async () => {
          ipcRenderer.send(AppEvent.menuClick, "reload");
        },
      });

      watchConfigFile({
        type: "user",
        callback: async () => {
          ipcRenderer.send(AppEvent.menuClick, "reload");
        },
      });
    }

    Vue.prototype.$bkConfig = BkConfigHandler;
    Vue.prototype.$config = config;
  },
};
