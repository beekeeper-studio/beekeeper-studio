import { describe, it, expect } from "vitest";
import Vue from "vue";
import { mount } from "@vue/test-utils";
import MysqlSessionVariables from "@/components/connection/MysqlSessionVariables.vue";

function mountWith(options: any) {
  const config = Vue.observable({ connectionType: "mysql", options });
  const wrapper = mount(MysqlSessionVariables, { propsData: { config } });
  return { config, wrapper };
}

function rows(wrapper) {
  return wrapper.findAll(".session-variable");
}

describe("MysqlSessionVariables", () => {
  it("starts collapsed with no variables, then adds one", async () => {
    const { config, wrapper } = mountWith({ connectionMethod: "manual" });
    expect(wrapper.find("button").exists()).toBe(false);

    await wrapper.find(".btn-toggle").trigger("click");
    await wrapper.find("button").trigger("click");

    expect(config.options.sessionVariables).toEqual([{ name: "", value: "" }]);
    expect(rows(wrapper).length).toBe(1);

    const [name, value] = rows(wrapper).at(0).findAll("input").wrappers;
    await name.setValue("collation_connection");
    await value.setValue("utf8mb4_unicode_520_ci");
    expect(config.options.sessionVariables).toEqual([
      { name: "collation_connection", value: "utf8mb4_unicode_520_ci" },
    ]);
    wrapper.destroy();
  });

  it("shows saved variables expanded and removes the chosen row", async () => {
    const { config, wrapper } = mountWith({
      sessionVariables: [
        { name: "sql_mode", value: "ANSI" },
        { name: "time_zone", value: "+00:00" },
      ],
    });
    // ToggleFormArea expands in its mounted hook
    await wrapper.vm.$nextTick();
    expect(rows(wrapper).length).toBe(2);

    await rows(wrapper).at(0).find(".a-icon").trigger("click");

    expect(config.options.sessionVariables).toEqual([{ name: "time_zone", value: "+00:00" }]);
    expect(rows(wrapper).length).toBe(1);
    wrapper.destroy();
  });

  it("expands when variables arrive while the form is open", async () => {
    const { config, wrapper } = mountWith({ connectionMethod: "manual" });
    await wrapper.vm.$nextTick();
    expect(rows(wrapper).length).toBe(0);

    // Import from URL replaces the whole options object
    config.options = { sessionVariables: [{ name: "time_zone", value: "'+00:00'" }] };
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(rows(wrapper).length).toBe(1);
    wrapper.destroy();
  });

  it("creates options when the config has none", async () => {
    const { config, wrapper } = mountWith(undefined);
    await wrapper.find(".btn-toggle").trigger("click");
    await wrapper.find("button").trigger("click");
    expect(config.options).toEqual({ sessionVariables: [{ name: "", value: "" }] });
    wrapper.destroy();
  });
});
