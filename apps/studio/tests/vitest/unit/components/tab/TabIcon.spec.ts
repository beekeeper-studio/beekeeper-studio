import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import TabIcon from "@/components/tab/TabIcon.vue";

Vue.use(Vuex);

function mountIcon(tabTypeConfigs: any[]) {
  const store = new Vuex.Store({
    modules: {
      tabs: {
        namespaced: true,
        getters: { tabTypeConfigs: () => tabTypeConfigs },
      },
    },
  });
  return mount(TabIcon, {
    store,
    propsData: {
      tab: {
        tabType: "plugin-base",
        context: { pluginId: "my-plugin" },
      },
    },
  });
}

describe("TabIcon.vue plugin tabs", () => {
  it("uses the plugin's icon when the manifest sets one", () => {
    const wrapper = mountIcon([
      { type: "plugin-base", pluginId: "my-plugin", icon: "analytics" },
    ]);
    expect(wrapper.text()).toBe("analytics");
  });

  it("falls back to the extension icon when the manifest has no icon", () => {
    const wrapper = mountIcon([
      { type: "plugin-base", pluginId: "my-plugin" },
    ]);
    expect(wrapper.text()).toBe("extension");
  });

  it("falls back to the extension icon when no config matches", () => {
    const wrapper = mountIcon([]);
    expect(wrapper.text()).toBe("extension");
  });
});
