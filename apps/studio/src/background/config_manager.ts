import * as path from "path";
import { homedir } from "os";
import ini from "ini";
import rawLog from "electron-log";
import { existsSync, readFileSync, watch, writeFileSync } from "fs";
import platformInfo from "../common/platform_info";
import { AppEvent } from "@/common/AppEvent";
import { getActiveWindows } from "./WindowBuilder";
import { ipcMain } from "electron";

export type ConfigType = "default" | "dev" | "user";

const log = rawLog.scope("config_manager");

const DEFAULT_CONFIG_FILENAME = "default.config.ini";
const DEV_CONFIG_FILENAME = "local.config.ini";
const USER_CONFIG_FILENAME = "user.config.ini";

function resolveConfigType(type: ConfigType) {
  let location: string;

  if (platformInfo.isDevelopment) {
    location = require("path").resolve("./");
  } else {
    location = homedir();
  }

  if (type === "default") {
    return path.join(location, DEFAULT_CONFIG_FILENAME);
  } else if (type === "dev") {
    return path.join(location, DEV_CONFIG_FILENAME);
  } else {
    return path.join(location, USER_CONFIG_FILENAME);
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

async function writeConfigFile(
  type: Exclude<ConfigType, "default">,
  config: unknown
) {
  return new Promise<void>((resolve, reject) => {
    try {
      log.debug("Writing user config", config);
      writeFileSync(resolveConfigType(type), ini.stringify(config));
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
  callback: (newConfig: unknown) => void;
  errorCallback?: (error: Error) => void;
}) {
  const { type, callback, errorCallback } = options;

  const watcher = watch(resolveConfigType(type));

  watcher.on("change", async () => {
    callback(await readConfigFile(type));
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

export function manageConfigs() {
  ipcMain.on(AppEvent.configStateManagerReady, async (event) => {
    try {
      const defaultConfig = await readConfigFile("default");
      event.sender.send(AppEvent.configChanged, "default", defaultConfig);

      if (platformInfo.isDevelopment) {
        const devConfig = await readConfigFile("dev");
        event.sender.send(AppEvent.configChanged, "dev", devConfig);
      } else {
        const userConfig = await readConfigFile("user");
        event.sender.send(AppEvent.configChanged, "user", userConfig);
      }
    } catch (error) {
      log.error(error);
    }
  });

  ipcMain.on(AppEvent.saveUserConfig, (_, userConfig) => {
    const type = platformInfo.isDevelopment ? "dev" : "user";
    writeConfigFile(type, userConfig);
  });

  if (platformInfo.isDevelopment) {
    watchConfigFile({
      type: "default",
      callback: (newConfig) => {
        getActiveWindows().forEach((beeWin) =>
          beeWin.send(AppEvent.configChanged, "default", newConfig)
        );
      },
    });

    watchConfigFile({
      type: "dev",
      callback: (newConfig) => {
        getActiveWindows().forEach((beeWin) =>
          beeWin.send(AppEvent.configChanged, "dev", newConfig)
        );
      },
    });
  }
}
