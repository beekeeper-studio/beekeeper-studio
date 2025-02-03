import config from "@/config";
import _ from "lodash";
import { BkConfigProvider, KeybindingPath } from "@/common/bkConfig/BkConfigProvider";
import type { VueConstructor } from "vue/types/umd";

export function createVHotkeyKeymap(
  obj: Partial<Record<KeybindingPath, any>>
): Record<string, any> {
  const keymap = {};

  for (const path of Object.keys(obj) as KeybindingPath[]) {
    const value = obj[path];
    const keybindings = window.bkConfig.getKeybindings("v-hotkey", path);
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
    const BkConfig = BkConfigProvider.create(window.bkConfigSource, window.platformInfo);
    window.bkConfig = BkConfig;
    Vue.prototype.$bkConfig = BkConfig;
    Vue.prototype.$config = config;
    Vue.prototype.$vHotkeyKeymap = createVHotkeyKeymap;
  },
};
