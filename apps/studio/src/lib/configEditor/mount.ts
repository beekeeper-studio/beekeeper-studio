import Vue from "vue";
import VTooltip from "v-tooltip";
import ConfigPlugin from "@/plugins/ConfigPlugin";
import NotyPlugin from "@/plugins/NotyPlugin";
import * as UIKit from "@beekeeperstudio/ui-kit";
import ConfigEditorWindow from "@/components/config/ConfigEditorWindow.vue";
import { flattenConfigKeys } from "@/common/bksConfig/configEditor";

/**
 * Boot the config editor window.
 *
 * Deliberately minimal compared to the main app: no Vuex store, no utility
 * process connection, no plugin manager. Everything this window needs is
 * already on `window.bksConfigSource` or reachable over the config IPC.
 */
export function mountConfigEditor(theme?: string): void {
  document.body.className = `theme-${theme || "dark"}`;

  Vue.config.productionTip = false;
  Vue.use(VTooltip, { defaultHtml: false });
  Vue.use(ConfigPlugin);
  Vue.use(NotyPlugin, {
    timeout: 2300,
    progressBar: true,
    layout: "bottomRight",
    theme: "mint",
    closeWith: ["button", "click"],
  });

  UIKit.setClipboard(
    new (class extends EventTarget implements Clipboard {
      async writeText(text: string) {
        window.main.writeTextToClipboard(text);
      }
      async readText() {
        return window.main.readTextFromClipboard();
      }
      async read(): Promise<ClipboardItem[]> {
        throw new Error("Not implemented");
      }
      async write(_items: ClipboardItem[]) {
        throw new Error("Not implemented");
      }
    })()
  );

  // Feed key autocompletion from the shipped defaults, which are the
  // authoritative list of what the app understands.
  UIKit.setIniKeys(flattenConfigKeys(window.bksConfigSource.defaultConfig));

  new Vue({
    render: (h) => h(ConfigEditorWindow),
  }).$mount("#app");
}
