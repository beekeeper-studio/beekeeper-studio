import { describe, it, expect } from "vitest";
import { shallowMount } from "@vue/test-utils";
import MergeManager from "@/components/editor/MergeManager.vue";

function mountManager(propsData: Record<string, unknown>) {
  return shallowMount(MergeManager, {
    propsData: { pendingRemoteChanges: true, ...propsData },
    stubs: { portal: true },
  });
}

// Cloud queries can come back with `text: null` (#4490)
describe("MergeManager", () => {
  it("merges a remote query with null text without throwing", () => {
    const wrapper = mountManager({ query: { text: null }, originalText: "", unsavedText: "select 1" });

    expect((wrapper.vm as any).generateNewText()).toBe("select 1");
    wrapper.destroy();
  });

  it("discards local changes to a remote query with null text as empty text", () => {
    const wrapper = mountManager({ query: { text: null }, originalText: "select 1", unsavedText: "select 1" });

    (wrapper.vm as any).merge();

    expect(wrapper.emitted("change")).toEqual([[""]]);
    wrapper.destroy();
  });
});
