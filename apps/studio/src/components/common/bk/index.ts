/* eslint-disable vue/component-definition-name-casing */
import _Vue from "vue";
import BkButton from "./BkButton.vue";
import BkButtons from "./BkButtons.vue";
import BkLabel from "./BkLabel.vue";
import BkMenu from "./BkMenu.vue";
import BkMenuitem from "./BkMenuitem.vue";
import BkProgressbar from "./BkProgressbar.vue";
import BkShortcut from "./BkShortcut.vue";
import BkSwitch from "./BkSwitch.vue";
import BkTab from "./BkTab.vue";
import BkTabs from "./BkTabs.vue";

// Lightweight Vue replacements for the (now removed) `xel` web components.
// Registered globally so templates can use them as <bk-button>, <bk-menu>, etc.
export default {
  install(Vue: typeof _Vue): void {
    Vue.component("bk-button", BkButton);
    Vue.component("bk-buttons", BkButtons);
    Vue.component("bk-label", BkLabel);
    Vue.component("bk-menu", BkMenu);
    Vue.component("bk-menuitem", BkMenuitem);
    Vue.component("bk-progressbar", BkProgressbar);
    Vue.component("bk-shortcut", BkShortcut);
    Vue.component("bk-switch", BkSwitch);
    Vue.component("bk-tab", BkTab);
    Vue.component("bk-tabs", BkTabs);
  },
};
