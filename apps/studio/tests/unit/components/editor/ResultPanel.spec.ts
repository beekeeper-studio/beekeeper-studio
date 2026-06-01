import { shallowMount } from "@vue/test-utils";
import Vue from "vue";
import ResultPanel from "@/components/editor/ResultPanel.vue";

// jsdom doesn't have ResizeObserver
(global as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// pluralize is reached via window.main.pluralize in the component
(global as any).window.main = {
  pluralize: (word: string, count: number) =>
    count === 1 ? word : `${word}s`,
};

const baseProps = {
  result: { rows: [], fields: [], affectedRows: 0 },
  resultIndex: 0,
  totalResults: 3,
  tab: { id: 1, title: "Untitled Query" },
};

describe("ResultPanel.vue", () => {
  it("shows the no-rows message when result has no rows", () => {
    const wrapper = shallowMount(ResultPanel, {
      propsData: {
        ...baseProps,
        result: { rows: [], fields: [], affectedRows: 5 },
      },
      stubs: { "result-table": true },
    });

    expect(wrapper.text()).toContain("No Results");
    expect(wrapper.text()).toContain("5");
  });

  it("renders the row count in the header", async () => {
    const wrapper = shallowMount(ResultPanel, {
      propsData: {
        ...baseProps,
        result: {
          rows: [{ a: 1 }, { a: 2 }, { a: 3 }],
          fields: [{ name: "a", id: "a" }],
          affectedRows: 0,
        },
      },
      stubs: { "result-table": true },
    });

    await Vue.nextTick();
    expect(wrapper.find(".result-panel-label").text()).toContain("Result 1");
    expect(wrapper.find(".result-panel-meta").text()).toContain("3");
  });

  it("hides the header when showHeader=false", () => {
    const wrapper = shallowMount(ResultPanel, {
      propsData: { ...baseProps, showHeader: false },
      stubs: { "result-table": true },
    });

    expect(wrapper.find(".result-panel-header").exists()).toBe(false);
  });

  it("hides the maximize button when canMaximize=false", () => {
    const wrapper = shallowMount(ResultPanel, {
      propsData: { ...baseProps, canMaximize: false },
      stubs: { "result-table": true },
    });

    expect(wrapper.find(".result-panel-maximize").exists()).toBe(false);
  });

  it("emits toggle-maximize when the maximize button is clicked", async () => {
    const wrapper = shallowMount(ResultPanel, {
      propsData: { ...baseProps, canMaximize: true },
      stubs: { "result-table": true },
    });

    await wrapper.find(".result-panel-maximize").trigger("click");
    expect(wrapper.emitted("toggle-maximize")).toBeTruthy();
    expect(wrapper.emitted("toggle-maximize")).toHaveLength(1);
  });

  it("emits focus when the header is mousedown'd", async () => {
    const wrapper = shallowMount(ResultPanel, {
      propsData: baseProps,
      stubs: { "result-table": true },
    });

    await wrapper.find(".result-panel-header").trigger("mousedown");
    expect(wrapper.emitted("focus")).toBeTruthy();
  });
});
