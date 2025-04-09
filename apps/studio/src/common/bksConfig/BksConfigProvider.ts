import rawLog from "@bksLogger";
import _ from "lodash";
import type { IPlatformInfo } from "../IPlatformInfo";

export interface BksConfigSource {
  defaultConfig: IBksConfig;
  systemConfig: Partial<IBksConfig>;
  userConfig: Partial<IBksConfig>;
  warnings: ConfigEntryDetailWarning[];
}

export type BksConfig = BksConfigProvider & IBksConfig;

export type IniArray = {
  [key: number]: string | number;
};

export interface ConfigEntryDetailWarning {
  type: "unrecognized-key" | "system-user-conflict";
  sourceName: "system" | "user";
  section: string;
  path: string;
}

type ConfigValue = string | number | IniArray | undefined;

export type KeybindingPath = DeepKeyOf<IBksConfig["keybindings"]>;

interface IBksConfigDebugInfo {
  path: string;
  value: string | number | undefined;
  config: Config;
  configs: {
    user: Partial<IBksConfig>;
    default: IBksConfig;
  };
}

const log = rawLog.scope("BksConfigProvider");

const electronModifierMap = {
  CTRL: "Control",
  CMD: "Command",
  CTRLORCMD: "CommandOrControl",
  CMDORCTRL: "CommandOrControl",
  CONTROL: "Control",
  COMMAND: "Command",
  CONTROLORCOMMAND: "CommandOrControl",
  COMMANDORCONTROL: "CommandOrControl",
  SHIFT: "Shift",
  ALT: "Alt",
  OPTION: "Option",
  ALTGR: "AltGr",
  SUPER: "Super",
  META: "Meta",
  WINDOWS: "Meta",
} as const;

const vHotkeyModifierMap = {
  CTRL: "ctrl",
  CMD: "cmd",
  CTRLORCMD: "ctrlOrCmd",
  CMDORCTRL: "ctrlOrCmd",
  CONTROL: "ctrl",
  COMMAND: "cmd",
  CONTROLORCOMMAND: "ctrlOrCmd",
  COMMANDORCONTROL: "ctrlOrCmd",
  SHIFT: "shift",
  ALT: "alt",
  OPTION: "option",
  ALTGR: "altgr",
  SUPER: "super",
  META: "meta",
  WINDOWS: "windows",
} as const;

export function convertKeybinding(
  target: "electron" | "v-hotkey",
  keybinding: string,
  platform: "windows" | "mac" | "linux"
) {
  const modifierMap =
    target === "electron" ? electronModifierMap : vHotkeyModifierMap;

  const combination: string[] = [];
  for (const _key of keybinding.split("+")) {
    const key = _key.toUpperCase().trim();

    let mod: string = modifierMap[key] ?? key;

    if (target === "v-hotkey") {
      mod = mod.toLowerCase();
      if (mod === "ctrlorcmd") {
        mod = platform === "mac" ? "meta" : "ctrl";
      }
    }

    combination.push(mod);
  }

  return combination.join("+");
}

/**
 * Array that is parsed by ini.parse is not exactly an array because
 * it doesn't have `length` property. Testing it with `Array.isArray` or
 * `_.isArray` will fail. Use this to test it.
 */
export function isIniArray(value: any): value is IniArray {
  return (
    _.isObject(value) &&
    Object.keys(value).every((key) => !Number.isNaN(Number.parseInt(key)))
  );
}

class Config {
  debugInfo: string;
  private log: ReturnType<typeof rawLog["scope"]>;

  constructor(
    public readonly name: string,
    public readonly config: Partial<IBksConfig>
  ) {
    this.log = rawLog.scope(`BksConfig:${this.name}`);
    Object.assign(this, config);
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
}

export class BksConfigProvider {
  private defaultConfig: Config;
  private systemConfig: Config;
  private userConfig: Config;
  private mergedConfig: IBksConfig;

  constructor(public readonly source: BksConfigSource, private platformInfo: IPlatformInfo) {
    this.defaultConfig = new Config("default", source.defaultConfig);
    this.systemConfig = new Config("system", source.systemConfig);
    this.userConfig = new Config(
      platformInfo.isDevelopment ? "dev" : "user",
      source.userConfig
    );
    this.mergedConfig = _.merge(
      {},
      source.defaultConfig,
      source.userConfig,
      source.systemConfig
    );
  }

  static create(source: BksConfigSource, platformInfo: IPlatformInfo) {
    const provider = new BksConfigProvider(source, platformInfo);
    Object.assign(provider, provider.mergedConfig);
    return provider as BksConfig;
  }

  has(path: string): boolean {
    return this.userConfig.has(path);
  }

  get(path: string): ConfigValue {
    const { value } = this.resolvePath(path);
    return value;
  }

  getAll(): IBksConfig {
    return this.mergedConfig;
  }

  debug(path: string) {
    const { config, value } = this.resolvePath(path);
    return {
      path,
      value,
      config,
      configs: {
        default: this.defaultConfig.config,
        system: this.systemConfig.config,
        user: this.userConfig.config,
      },
    };
  }

  get debugAll() {
    const getDebugAll = (obj: Record<string, any>, path = "") => {
      const result: IBksConfigDebugInfo[] = [];
      Object.keys(obj).forEach((key) => {
        const type = typeof obj[key];
        if (type === "string" || type === "number" || _.isArray(obj[key])) {
          result.push(
            this.debug(path ? `${path}.${key}` : key) as IBksConfigDebugInfo
          );
        } else {
          result.push(...getDebugAll(obj[key], path ? `${path}.${key}` : key));
        }
      });
      return result;
    };

    return getDebugAll(this.mergedConfig);
  }

  getKeybindings(target: "electron" | "v-hotkey", path: KeybindingPath) {
    const keybindings = this.get(`keybindings.${path}`);

    if (isIniArray(keybindings)) {
      return Object.keys(keybindings).map((idx) =>
        convertKeybinding(target, keybindings[idx], this.platformInfo.platform)
      );
    }

    if (typeof keybindings !== "string") {
      log.warn(`Invalid keybindings: ${keybindings} at ${path}`);
    }

    // @ts-expect-error keybindings should be a string
    return convertKeybinding(target, keybindings, this.platformInfo.platform);
  }

  get warnings() {
    return this.source.warnings;
  }

  private resolvePath(path: string) {
    let config: Config = this.defaultConfig;
    if (this.systemConfig.has(path)) {
      config = this.systemConfig;
    } else if (this.userConfig.has(path)) {
      config = this.userConfig;
    }
    return { config, value: config.get(path) };
  }
}
