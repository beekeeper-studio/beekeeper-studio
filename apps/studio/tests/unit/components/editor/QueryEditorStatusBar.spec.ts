import { shallowMount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import QueryEditorStatusBar from "@/components/editor/QueryEditorStatusBar.vue";

Vue.use(Vuex);

(global as any).window.main = {
  pluralize: (word: string, count: number) =>
    count === 1 ? word : `${word}s`,
};

function makeStore() {
  return new Vuex.Store({
    state: {
      connection: {},
      usedConfig: { readOnlyMode: false },
    },
    getters: { dialect: () => "postgresql", isCommunity: () => false },
    modules: {
      settings: {
        namespaced: true,
        state: {
          settings: {
            keymap: { value: "default" },
            hideResultsDropdown: { value: false },
          },
        },
        actions: { save: jest.fn() },
      },
    },
  });
}

const stubs = {
  statusbar: { template: "<div><slot /></div>" },
  "x-buttons": { template: "<div><slot /></div>" },
  "x-button": { template: "<div><slot /></div>" },
  "x-menu": { template: "<div><slot /></div>" },
  "x-menuitem": { template: "<div><slot /></div>" },
  "x-label": { template: "<div><slot /></div>" },
};

const mocks = {
  $config: { defaults: { keymapTypes: [{ name: "Default", value: "default" }] } },
  $bksConfig: {},
  $vHotkeyKeymap: () => ({}),
  $store: makeStore(),
};

function mount(propsData: any) {
  return shallowMount(QueryEditorStatusBar, {
    propsData: {
      results: [],
      running: false,
      value: 0,
      executeTime: 0,
      elapsedTime: 0,
      active: true,
      wrapText: false,
      viewMode: "tabbed",
      splitOrientation: "horizontal",
      ...propsData,
    },
    store: makeStore(),
    stubs,
    mocks,
  });
}

describe("QueryEditorStatusBar layout toggle", () => {
  it("emits layout-change with tabbed mode when the tabbed button is clicked", () => {
    const wrapper = mount({
      results: [
        { rows: [{ a: 1 }], affectedRows: 0 },
        { rows: [{ b: 2 }], affectedRows: 0 },
      ],
      viewMode: "split",
      splitOrientation: "horizontal",
    });

    (wrapper.vm as any).setLayout("tabbed", "horizontal");
    expect(wrapper.emitted("layout-change")[0]).toEqual([
      { mode: "tabbed", orientation: "horizontal" },
    ]);
  });

  it("emits layout-change with split horizontal", () => {
    const wrapper = mount({
      results: [
        { rows: [{ a: 1 }], affectedRows: 0 },
        { rows: [{ b: 2 }], affectedRows: 0 },
      ],
    });

    (wrapper.vm as any).setLayout("split", "horizontal");
    expect(wrapper.emitted("layout-change")[0]).toEqual([
      { mode: "split", orientation: "horizontal" },
    ]);
  });

  it("emits layout-change with split vertical", () => {
    const wrapper = mount({
      results: [
        { rows: [{ a: 1 }], affectedRows: 0 },
        { rows: [{ b: 2 }], affectedRows: 0 },
      ],
    });

    (wrapper.vm as any).setLayout("split", "vertical");
    expect(wrapper.emitted("layout-change")[0]).toEqual([
      { mode: "split", orientation: "vertical" },
    ]);
  });

  it("renders three toggle buttons when there are 2+ results", () => {
    const wrapper = mount({
      results: [
        { rows: [{ a: 1 }], affectedRows: 0 },
        { rows: [{ b: 2 }], affectedRows: 0 },
      ],
    });

    const toggle = wrapper.find(".results-view-toggle");
    expect(toggle.exists()).toBe(true);
    // tabbed, stacked, side-by-side
    expect(toggle.findAll("button").length).toBe(3);
  });

  it("marks the matching toggle button as active", () => {
    const wrapper = mount({
      results: [
        { rows: [{ a: 1 }], affectedRows: 0 },
        { rows: [{ b: 2 }], affectedRows: 0 },
      ],
      viewMode: "split",
      splitOrientation: "vertical",
    });

    const activeButtons = wrapper
      .find(".results-view-toggle")
      .findAll("button.active");
    expect(activeButtons.length).toBe(1);
    expect(activeButtons.at(0).attributes("aria-label")).toBe(
      "Split side by side"
    );
  });
});
