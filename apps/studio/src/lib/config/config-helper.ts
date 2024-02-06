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

/** Exported for tests. Avoid using this directly. Please use `getKeybindingFor` instead. */
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
