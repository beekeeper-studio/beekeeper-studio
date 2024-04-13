import ini from "ini";
import rawLog from "electron-log";
import platformInfo from "@/common/platform_info";
import * as path from "path";
import _ from "lodash";
import { existsSync, readFileSync, watch, writeFileSync } from "fs";
import { transform } from "@/../configTransformer";

/**
 * Array that is parsed by ini.parse. Not exact array or array-like because
 * it doesn't have `length` property. Testing it with `Array.isArray` or
 * `_.isArray` will fail. Use `isIniArray` to test it.
 */
export type IniArray = {
  [key: number]: string | number;
};

export interface ConfigWarning {
  type: "section" | "key";
  key: string;
}
type ConfigSource = "default" | "user" | undefined;

type ConfigValue = string | number | IniArray | undefined;

export type KeybindingPath = DeepKeyOf<IBkConfig["keybindings"]>;

interface IBkConfigDebugInfo {
  path: string;
  value: string | number | undefined;
  source: ConfigSource;
  configs: {
    user: Partial<IBkConfig>;
    default: IBkConfig;
  };
}

const electronModifierMap = {
  ctrl: "Control",
  cmd: "Command",
  ctrlorcmd: "CommandOrControl",
  cmdorctrl: "CommandOrControl",
  control: "Control",
  command: "Command",
  controlorcommand: "CommandOrControl",
  commandorcontrol: "CommandOrControl",
  shift: "Shift",
  alt: "Alt",
  option: "Option",
  altgr: "AltGr",
  super: "Super",
  meta: "Meta",
  windows: "Meta",
};

const vHotkeyModifierMap = {
  ctrl: "ctrl",
  cmd: "cmd",
  ctrlorcmd: "ctrlOrCmd",
  cmdorctrl: "ctrlOrCmd",
  control: "ctrl",
  command: "cmd",
  controlorcommand: "ctrlOrCmd",
  commandorcontrol: "ctrlOrCmd",
  shift: "shift",
  alt: "alt",
  option: "option",
  altgr: "altgr",
  super: "super",
  meta: "meta",
  windows: "windows",
};

export function convertKeybinding(
  target: "electron" | "v-hotkey",
  keybinding: string,
  platform: "windows" | "mac" | "linux"
) {
  const modifierMap =
    target === "electron" ? electronModifierMap : vHotkeyModifierMap;

  const combination: string[] = [];
  for (const _key of keybinding.split("+")) {
    const key = _key.toLowerCase().trim();

    const mod = modifierMap[key];

    if (target === "v-hotkey" && mod === "ctrlOrCmd") {
      combination.push(platform === "mac" ? "meta" : "ctrl");
      continue;
    }

    if (mod) {
      combination.push(mod);
      continue;
    }

    if (target === "electron") {
      combination.push(key.toUpperCase());
      continue;
    }

    combination.push(key);
  }

  return combination.join("+");
}

/**
 * Check any config keys from `userConfig` that we don't recognize based on
 * `defaultConfig`.
 **/
export function checkConfigWarnings(
  defaultConfig: IBkConfig,
  userConfig: Partial<IBkConfig>
): ConfigWarning[] {
  const results = [];

  function traverse(obj: Record<string, any>, parentPath = "") {
    for (const key of Object.keys(obj)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const recognized = _.has(defaultConfig, path);

      if (!recognized) {
        if (typeof obj[key] === "object") {
          results.push({ type: "section", section: path });
        } else {
          results.push({
            type: "key",
            section: parentPath,
            key,
            value: obj[key],
          });
        }
        continue;
      }

      if (typeof obj[key] === "object") {
        traverse(obj[key], path);
      }
    }
  }

  traverse(userConfig);

  return results;
}

export function parseIni(text: string) {
  return transform(ini.parse(text));
}

export function isIniArray(value: any): value is IniArray {
  return (
    _.isObject(value) &&
    Object.keys(value).every((key) => !Number.isNaN(Number.parseInt(key)))
  );
}

class Config {
  name: string;
  config: IBkConfig;
  filePath: string;
  debugInfo: string;
  log: rawLog.LogFunctions;

  constructor(options: {
    name: string;
    filePath: string;
    suppressWarnings?: boolean;
  }) {
    this.name = options.name;
    this.filePath = options.filePath;
    this.log = rawLog.scope(`BkConfig:${this.name}`);
    this.debugInfo = `Name: ${this.name}, File path: ${this.filePath}`;
  }

  async load() {
    this.log.debug("Loading config.");

    if (!existsSync(this.filePath)) {
      throw new Error(`Config does not exist. ${this.debugInfo}`);
    }

    try {
      this.config = this._read();
      this.log.debug(`Config successfully loaded.`);
    } catch (error) {
      this.log.debug(`Failed reading config.`, error);
      throw error;
    }
  }

  async save() {
    this.log.debug("Saving config.");

    const config = this._read();
    this._write(_.merge(config, this.config));

    this.log.debug("Config successfully saved.");
  }

  _read(): IBkConfig {
    try {
      this.log.debug("Reading config.");
      const config = parseIni(readFileSync(this.filePath, "utf-8"));
      this.log.debug("Config successfully read.");
      return config;
    } catch (error) {
      this.log.debug("Failed reading config.", error);
      throw error;
    }
  }

  _write(config: IBkConfig) {
    this.log.debug("Writing config.", config);
    try {
      writeFileSync(this.filePath, ini.stringify(config));
      this.log.info("Config successfully wrote.");
    } catch (error) {
      this.log.debug("Failed writing config.", error);
      throw error;
    }
  }

  has(path: string) {
    return !_.isNil(_.get(this.config, path));
  }

  get(path: string) {
    const result = _.get(this.config, path);
    if (result == null) {
      this.log.warn(`key not found: ${path}`);
    }
    return result;
  }

  async set(path: string, value: unknown) {
    if (!this.has(path)) {
      this.log.warn(`key not found: ${path}`);
    }
    const safeValue = ini.safe(value.toString());
    _.set(this.config, path, safeValue);
    await this.save();
    return safeValue;
  }
}

class BkConfigManager {
  _defaultConfig: Config;
  _userConfig: Config;
  _configPath: string;
  _initialized: boolean;
  warnings: ConfigWarning[];
  log: rawLog.LogFunctions;

  constructor() {
    this._initialized = false;
    this._configPath = this._resolveConfigPath();
    this.log = rawLog.scope("BkConfigManager");

    this._defaultConfig = new Config({
      name: "default",
      filePath: path.join(this._configPath, "default.config.ini"),
    });

    this._userConfig = new Config({
      name: platformInfo.isDevelopment ? "dev" : "user",
      filePath: path.join(
        this._configPath,
        platformInfo.isDevelopment ? "local.config.ini" : "user.config.ini"
      ),
    });
  }

  async initialize() {
    if (this._initialized) {
      this.log.warn("Config already initialized.");
      return;
    }

    this.log.debug("Initializing config.");

    await this._defaultConfig.load();
    await this._userConfig.load();

    this.warnings = checkConfigWarnings(
      this._defaultConfig.config,
      this._userConfig.config
    );

    const mergedConfig = this._generateMergedConfig();

    Object.assign(this, mergedConfig);

    this.log.debug("Config successfully initialized.", JSON.stringify(mergedConfig, null, 2));

    this._initialized = true;
  }

  has(path: string): boolean {
    this._guard();
    return this._userConfig.has(path);
  }

  get(path: string): ConfigValue {
    this._guard();
    return this._userConfig.get(path) || this._defaultConfig.get(path);
  }

  async set(path: string, value: unknown) {
    this._guard();
    const val = await this._userConfig.set(path, value);
    _.set(this, path, val);
  }

  debug(path: string) {
    this._guard();

    let source: ConfigSource;
    let value: ConfigValue;

    if (this._userConfig.has(path)) {
      source = "user";
      value = this._userConfig.get(path);
    } else if (this._defaultConfig.has(path)) {
      source = "default";
      value = this._defaultConfig.get(path);
    }

    return {
      path,
      value,
      source,
      configs: {
        default: this._defaultConfig.config,
        user: this._userConfig.config,
      },
    };
  }

  get debugAll() {
    this._guard();

    const getDebugAll = (obj: Record<string, any>, path = "") => {
      const result: IBkConfigDebugInfo[] = [];
      Object.keys(obj).forEach((key) => {
        const type = typeof obj[key];
        if (type === "string" || type === "number" || _.isArray(obj[key])) {
          result.push(
            this.debug(path ? `${path}.${key}` : key) as IBkConfigDebugInfo
          );
        } else {
          result.push(...getDebugAll(obj[key], path ? `${path}.${key}` : key));
        }
      });
      return result;
    };

    return getDebugAll(this._generateMergedConfig());
  }

  getKeybindings(target: "electron" | "v-hotkey", path: KeybindingPath) {
    this._guard();

    const keybindings = this.get(`keybindings.${path}`);

    if (isIniArray(keybindings)) {
      return Object.keys(keybindings).map((idx) =>
        convertKeybinding(target, keybindings[idx], platformInfo.platform)
      );
    }

    if (typeof keybindings !== "string") {
      this.log.warn(`Invalid keybindings: ${keybindings} at ${path}`);
    }

    // @ts-expect-error keybindings should be a string
    return convertKeybinding(target, keybindings, platformInfo.platform);
  }

  /** WARNING: Not optimized for production */
  watchConfigFile(options: {
    type: ConfigSource;
    callback: () => void;
    errorCallback?: (error: Error) => void;
  }) {
    const config =
      options.type === "user" ? this._userConfig : this._defaultConfig;

    const watcher = watch(config.filePath);

    watcher.on("change", async () => {
      options.callback();
    });

    watcher.on("error", (error) => {
      this.log.error(error);
      if (options.errorCallback) {
        options.errorCallback(error);
      }
    });

    return () => {
      watcher.close();
    };
  }

  _guard() {
    if (!this._initialized) {
      throw new Error("Config not initialized.");
    }
  }

  _resolveConfigPath() {
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

    if (process.env.TEST_MODE) {
      return path.resolve(dirpath, "../../../../..");
    }

    return path.resolve(__dirname, "../../..");
  }

  _generateMergedConfig() {
    return _.merge({}, this._defaultConfig.config, this._userConfig.config);
  }
}

const BkConfig = new BkConfigManager() as BkConfigManager & IBkConfig;

export { BkConfig };
