import { mount, createLocalVue } from "@vue/test-utils";
import BkComponents from "@/components/common/bk";
import BkShortcut from "@/components/common/bk/BkShortcut.vue";
import BkButton from "@/components/common/bk/BkButton.vue";
import BkSwitch from "@/components/common/bk/BkSwitch.vue";
import BkMenuitem from "@/components/common/bk/BkMenuitem.vue";

const localVue = createLocalVue();
localVue.use(BkComponents);

describe("bk components", () => {
  // jsdom reports navigator.platform === "" -> non-Apple formatting
  describe("BkShortcut formatting", () => {
    const cases: [string, string][] = [
      ["Control+S", "Ctrl+S"],
      ["Control+Shift+S", "Ctrl+Shift+S"],
      ["Meta+S", "Meta+S"],
      ["Control+Alt+Delete", "Ctrl+Alt+Delete"],
      ["ArrowUp", "Up"],
      ["Control+ArrowLeft", "Ctrl+Left"],
      ["F5", "F5"],
    ];

    it.each(cases)("formats %s as %s", (value, expected) => {
      const wrapper = mount(BkShortcut, { localVue, propsData: { value } });
      expect(wrapper.text()).toBe(expected);
    });
  });

  it("BkButton renders a focusable button role with the bk-button class", () => {
    const wrapper = mount(BkButton, { localVue, slots: { default: "Hi" } });
    expect(wrapper.classes()).toContain("bk-button");
    expect(wrapper.attributes("role")).toBe("button");
    expect(wrapper.attributes("tabindex")).toBe("0");
    expect(wrapper.text()).toContain("Hi");
  });

  it("BkButton is not focusable while disabled", () => {
    const wrapper = mount(BkButton, { localVue, attrs: { disabled: true } });
    expect(wrapper.attributes("tabindex")).toBe("-1");
    expect(wrapper.attributes("disabled")).toBeDefined();
  });

  it("BkSwitch reflects the toggled attribute and renders track + thumb", () => {
    const wrapper = mount(BkSwitch, { localVue, attrs: { toggled: true } });
    expect(wrapper.classes()).toContain("bk-switch");
    expect(wrapper.attributes("toggled")).toBeDefined();
    expect(wrapper.find(".bk-switch-track").exists()).toBe(true);
    expect(wrapper.find(".bk-switch-thumb").exists()).toBe(true);
  });

  it("BkMenuitem shows a checkmark only when togglable", () => {
    const plain = mount(BkMenuitem, { localVue });
    expect(plain.find(".bk-checkmark").exists()).toBe(false);

    const togglable = mount(BkMenuitem, { localVue, attrs: { togglable: "" } });
    expect(togglable.find(".bk-checkmark").exists()).toBe(true);

    const notTogglable = mount(BkMenuitem, { localVue, attrs: { togglable: false } });
    expect(notTogglable.find(".bk-checkmark").exists()).toBe(false);
  });
});
