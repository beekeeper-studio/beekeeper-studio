import { shallowMount } from "@vue/test-utils";
import Vue from "vue";

jest.mock("split.js", () => {
  const splitMock: any = jest.fn(() => ({
    destroy: jest.fn(),
    getSizes: jest.fn(() => [50, 50]),
    setSizes: jest.fn(),
  }));
  return { __esModule: true, default: splitMock };
});

import SplitResultsContainer from "@/components/editor/SplitResultsContainer.vue";

(global as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

(global as any).window.main = {
  pluralize: (word: string, count: number) =>
    count === 1 ? word : `${word}s`,
};

function makeResults(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    rows: [{ a: i }],
    fields: [{ name: "a", id: "a" }],
    affectedRows: 0,
  }));
}

const baseProps = {
  query: null,
  tab: { id: 1, title: "Untitled Query" },
  active: true,
  binaryEncoding: "hex",
};

describe("SplitResultsContainer.vue", () => {
  it("renders one ResultPanel per result", () => {
    const wrapper = shallowMount(SplitResultsContainer, {
      propsData: {
        ...baseProps,
        results: makeResults(3),
        orientation: "horizontal",
      },
    });

    expect(wrapper.findAllComponents({ name: "ResultPanel" })).toHaveLength(3);
  });

  it("applies orientation class to the container", () => {
    const wrapper = shallowMount(SplitResultsContainer, {
      propsData: {
        ...baseProps,
        results: makeResults(2),
        orientation: "vertical",
      },
    });

    expect(wrapper.classes()).toContain("orientation-vertical");
  });

  it("re-applies class when orientation prop changes", async () => {
    const wrapper = shallowMount(SplitResultsContainer, {
      propsData: {
        ...baseProps,
        results: makeResults(2),
        orientation: "horizontal",
      },
    });

    await wrapper.setProps({ orientation: "vertical" });
    expect(wrapper.classes()).toContain("orientation-vertical");
    expect(wrapper.classes()).not.toContain("orientation-horizontal");
  });

  it("marks container as maximized when a panel is maximized", () => {
    const wrapper = shallowMount(SplitResultsContainer, {
      propsData: {
        ...baseProps,
        results: makeResults(3),
        orientation: "horizontal",
        maximizedIndex: 1,
      },
    });

    expect(wrapper.classes()).toContain("is-maximized");
  });

  it("emits toggle-maximize with the new index when child fires the event", async () => {
    const wrapper = shallowMount(SplitResultsContainer, {
      propsData: {
        ...baseProps,
        results: makeResults(2),
        orientation: "horizontal",
        maximizedIndex: null,
      },
    });

    const panels = wrapper.findAllComponents({ name: "ResultPanel" });
    panels.at(1).vm.$emit("toggle-maximize");

    await Vue.nextTick();
    const emitted = wrapper.emitted("toggle-maximize");
    expect(emitted).toBeTruthy();
    expect(emitted[0]).toEqual([1]);
  });

  it("emits toggle-maximize with null when the currently maximized panel is toggled off", async () => {
    const wrapper = shallowMount(SplitResultsContainer, {
      propsData: {
        ...baseProps,
        results: makeResults(2),
        orientation: "horizontal",
        maximizedIndex: 0,
      },
    });

    const panels = wrapper.findAllComponents({ name: "ResultPanel" });
    panels.at(0).vm.$emit("toggle-maximize");

    await Vue.nextTick();
    expect(wrapper.emitted("toggle-maximize")[0]).toEqual([null]);
  });

  it("forwards focus-panel events from children with the panel index", async () => {
    const wrapper = shallowMount(SplitResultsContainer, {
      propsData: {
        ...baseProps,
        results: makeResults(2),
        orientation: "horizontal",
      },
    });

    const panels = wrapper.findAllComponents({ name: "ResultPanel" });
    panels.at(1).vm.$emit("focus");

    await Vue.nextTick();
    expect(wrapper.emitted("focus-panel")[0]).toEqual([1]);
  });
});
