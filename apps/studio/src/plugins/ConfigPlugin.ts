import { buildConfig } from "@/config";
import _ from "lodash";
import { BksConfigProvider, KeybindingPath } from "@/common/bksConfig/BksConfigProvider";
import type { VueConstructor } from "vue/types/umd";
import { ConfigMetadataProvider } from "@/common/bksConfig/ConfigMetadataProvider";

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
