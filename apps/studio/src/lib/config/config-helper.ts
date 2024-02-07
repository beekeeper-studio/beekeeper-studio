import { transform } from "../../../config-transformer";
import ini from "ini";
import _ from "lodash";

export interface UserConfigWarning {
  type: "section" | "key";
  key: string;
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

/**
 * Exported for tests. Avoid using this directly. Please use
 * `bkConfig.getKeybindings` instead.
 **/
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
 * Array that is parsed by ini.parse. Not exact array or array-like because
 * it doesn't have `length` property. Testing it with `Array.isArray` or
 * `_.isArray` will fail. Use `isIniArray` to test it.
 */
export type IniArray = {
  [key: number]: string;
};

export function isIniArray(value: any): value is IniArray {
  return (
    _.isObject(value) &&
    Object.keys(value).every((key) => !Number.isNaN(Number.parseInt(key)))
  );
}

/**
 * Check any config keys from `userConfig` that we don't recognize based on
 * `defaultConfig`.
 **/
export function checkConfigWarnings(
  defaultConfig: IBkConfig,
  userConfig: Partial<IBkConfig>
): UserConfigWarning[] {
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
            value: obj[key]
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
