import { buildConfig } from "@/config";
import _ from "lodash";
import { BksConfigProvider, KeybindingPath } from "@/common/bksConfig/BksConfigProvider";
import type { VueConstructor } from "vue/types/umd";
import { ConfigMetadataProvider } from "@/common/bksConfig/ConfigMetadataProvider";

/** Key names used by v-hotkey after convertKeybinding — keep in sync with v-hotkey codes. */
const V_HOTKEY_KEY_CODES: Record<string, number> = {
  backspace: 8,
  tab: 9,
  enter: 13,
  delete: 46,
  esc: 27,
  space: 32,
  left: 37,
  up: 38,
  right: 39,
  down: 40,
};

export function matchesVHotkeyBinding(event: KeyboardEvent, binding: string): boolean {
  const parts = binding.toLowerCase().split("+").map((part) => part.trim());
  let keyCode: number | undefined;
  let ctrl = false;
  let alt = false;
  let shift = false;
  let meta = false;

  for (const part of parts) {
    switch (part) {
      case "ctrl":
        ctrl = true;
        break;
      case "alt":
        alt = true;
        break;
      case "shift":
        shift = true;
        break;
      case "meta":
        meta = true;
        break;
      default:
        keyCode = V_HOTKEY_KEY_CODES[part];
    }
  }

  if (keyCode === undefined) {
    return false;
  }

  return (
    event.keyCode === keyCode &&
    event.ctrlKey === ctrl &&
    event.altKey === alt &&
    event.shiftKey === shift &&
    event.metaKey === meta
  );
}

export function createVHotkeyKeymap(
  obj: Partial<Record<KeybindingPath, any>>
): Record<string, any> {
  const keymap = {};

  for (const path of Object.keys(obj) as KeybindingPath[]) {
    const value = obj[path];
    const keybindings = window.bksConfig.getKeybindings("v-hotkey", path);
    if (typeof keybindings === "string") {
      keymap[keybindings] = value;
    } else {
      keybindings.forEach((keybinding) => {
        keymap[keybinding] = value;
      });
    }
  }

  return keymap;
}

export function createCodemirroKeymap(
  obj: Partial<Record<KeybindingPath, any>>
): Record<string, any> {
  const keymap = {};

  for (const path of Object.keys(obj) as KeybindingPath[]) {
    const value = obj[path];
    const keybindings = window.bksConfig.getKeybindings("codemirror", path);
    if (typeof keybindings === "string") {
      keymap[keybindings] = value;
    } else {
      keybindings.forEach((keybinding) => {
        keymap[keybinding] = value;
      });
    }
  }

  return keymap;
}

export default {
  install(Vue: VueConstructor) {
    const BksConfig = BksConfigProvider.create(window.bksConfigSource, window.platformInfo);
    window.bksConfig = BksConfig;
    Vue.prototype.$bksConfig = BksConfig;
    Vue.prototype.$bksConfigUI = new ConfigMetadataProvider({
      bksConfig: BksConfig,
      platformInfo: window.platformInfo,
    });
    Vue.prototype.$config = buildConfig(window.platformInfo);
    Vue.prototype.$vHotkeyKeymap = createVHotkeyKeymap;
    Vue.prototype.$CMKeymap = createCodemirroKeymap;
  },
};
