import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import SqlServerForm from "@/components/connection/SqlServerForm.vue";

Vue.use(Vuex);

function mountForm(host = "localhost") {
  const store = new Vuex.Store({
    state: { connection: null },
    getters: { isCommunity: () => false },
    modules: {
      settings: { namespaced: true, getters: { privacyMode: () => false } },
    },
  });
  const config = Vue.observable({
    connectionType: "sqlserver",
    host,
    port: 1433,
    username: null,
    password: null,
    domain: null,
    defaultDatabase: null,
    trustServerCertificate: true,
    windowsAuthEnabled: false,
    azureAuthOptions: {},
    sqlServerOptions: {},
  });
  const wrapper = mount(SqlServerForm, {
    store,
    propsData: { config },
    stubs: { CommonSsl: true, CommonAdvanced: true, CommonEntraId: true, FilePicker: true, PasswordInput: true },
    directives: { tooltip: {} },
  });
  return { wrapper, config };
}

// SSMS users type the port into the server name. The form moves it into the Port field
// once the Host field is committed, not on every keystroke.
describe("SqlServerForm host with a port", () => {
  async function commitHost(wrapper, value: string) {
    // The Host input has no id; it is the one showing the config's host.
    const host = wrapper
      .findAll(".host-port-user-password input")
      .filter((i) => (i.element as HTMLInputElement).value === "localhost")
      .at(0);
    await host.setValue(value);
    return host;
  }

  it("moves the port into the Port field when the host is committed", async () => {
    const { wrapper, config } = mountForm();

    const host = await commitHost(wrapper, "tcp:db.example.com\\SQL2019,1444");
    expect(config.host).toBe("tcp:db.example.com\\SQL2019,1444");
    expect(config.port).toBe(1433);

    await host.trigger("change");
    expect(config.host).toBe("db.example.com\\SQL2019");
    expect(config.port).toBe(1444);
    expect((host.element as HTMLInputElement).value).toBe("db.example.com\\SQL2019");
    wrapper.destroy();
  });

  it("moves the port straight away on paste", async () => {
    const { wrapper, config } = mountForm();

    const host = wrapper
      .findAll(".host-port-user-password input")
      .filter((i) => (i.element as HTMLInputElement).value === "localhost")
      .at(0);
    // A real paste fires `paste` first, then `input` with the new value.
    await host.trigger("paste");
    await host.setValue("db.example.com,1444");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(config.host).toBe("db.example.com");
    expect(config.port).toBe(1444);
    wrapper.destroy();
  });

  it("leaves a host without a port alone", async () => {
    const { wrapper, config } = mountForm();

    const host = await commitHost(wrapper, "db.example.com");
    await host.trigger("change");

    expect(config.host).toBe("db.example.com");
    expect(config.port).toBe(1433);
    wrapper.destroy();
  });
});
