import { buildConfig } from "@/config";
import _ from "lodash";
import { BksConfigProvider, KeybindingPath } from "@/common/bksConfig/BksConfigProvider";
import type { VueConstructor } from "vue/types/umd";
import { escapeHtml } from "@/shared/lib/tabulator";

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

export function createCodemirrorKeymap(
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

function formatKeybind(keybind: string, forXShortcut: boolean): string {
  const value = keybind.split('+').map(part => _.upperFirst(part.trim())).join('+');
  if (forXShortcut) {
    return value.replace(/Ctrl/g, 'Control');
  }

  return value;
}

export function getFormattedKeybindHint(path: KeybindingPath, showAll: boolean = true, forXShortcut: boolean = false): string {
  // just use v-hotkey for simplicity
  const keybind = window.bksConfig.getKeybindings('v-hotkey', path);
  if (!keybind || (typeof keybind != 'string' && !_.isArray(keybind))) {
    throw new Error('Path passed to getFormattedKeybindHint was not a keybind')
  }
  let value: string = null;

  if (typeof keybind === 'string') {
    value = formatKeybind(keybind,forXShortcut);
  }

  if (_.isArray(keybind) && _.isString(keybind[0])) {
    if (showAll) {
      value = keybind.map((key) => {
        return formatKeybind(key, forXShortcut);
      }).join(',');
    } else {
      value = formatKeybind(keybind[0], forXShortcut);
    }
  }

  if (value) {
    return escapeHtml(value);
  }

  throw new Error('Path passed to getFormattedKeybindHint was not a keybind')
}

export default {
  install(Vue: VueConstructor) {
    const BksConfig = BksConfigProvider.create(window.bksConfigSource, window.platformInfo);
    window.bksConfig = BksConfig;
    Vue.prototype.$bksConfig = BksConfig;
    Vue.prototype.$config = buildConfig(window.platformInfo);
    Vue.prototype.$vHotkeyKeymap = createVHotkeyKeymap;
    Vue.prototype.$CMKeymap = createCodemirrorKeymap;
    Vue.prototype.$formatKeybindHint = getFormattedKeybindHint;
  },
};
