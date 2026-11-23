import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Vue from "vue";
import Vuex from "vuex";
import CommonServerInputs from "@/components/connection/CommonServerInputs.vue";
import { parseConnectionUrl } from "@/common/connectionUrl";

Vue.use(Vuex);

// Pasting into Host: a connection URL or host:port fills the fields it names and nothing
// else; a plain hostname pastes as ordinary text. The parser itself is covered in
// tests/vitest/unit/common/connectionUrl.spec.ts -- here the real one stands in for the
// utility process so the whole paste path is exercised.
let hostIndex = -1;

function mountInputs(overrides: Record<string, unknown> = {}, privacyMode = false) {
  const store = new Vuex.Store({
    modules: { settings: { namespaced: true, getters: { privacyMode: () => privacyMode } } },
  });
  const config = Vue.observable({
    connectionType: "postgresql",
    host: "localhost",
    port: 5432,
    username: "existing_user",
    password: "existing_password",
    defaultDatabase: "existing_db",
    ssl: false,
    trustServerCertificate: false,
    socketPathEnabled: false,
    socketPath: null,
    ...overrides,
  });
  const send = vi.fn(async (_name: string, { url }: { url: string }) => parseConnectionUrl(url));
  const wrapper = mount(CommonServerInputs, {
    store,
    propsData: { config },
    stubs: { CommonSsl: true, PasswordInput: true },
    directives: { tooltip: {} },
    mocks: { $util: { send } },
  });
  // The Host input has no id. Outside privacy mode it is the one showing the host; in
  // privacy mode it is masked, so it is found by the position that gives.
  const inputs = wrapper.findAll("input");
  const shown = inputs.wrappers.findIndex((i) => (i.element as HTMLInputElement).value === "localhost");
  const host = inputs.at(privacyMode ? hostIndex : shown);
  if (!privacyMode) hostIndex = shown;
  return { wrapper, config, send, host };
}

async function paste(host, text: string) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  (event as any).clipboardData = { getData: () => text };
  host.element.dispatchEvent(event);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return event;
}

describe("CommonServerInputs paste into Host", () => {
  it("splits host:port into Host and Port and keeps everything else", async () => {
    const { wrapper, config, host } = mountInputs();

    const event = await paste(host, "db.example.com:5433");

    expect(event.defaultPrevented).toBe(true);
    expect(config.host).toBe("db.example.com");
    expect(config.port).toBe(5433);
    expect(config.username).toBe("existing_user");
    expect(config.password).toBe("existing_password");
    expect(config.defaultDatabase).toBe("existing_db");
    expect(config.connectionType).toBe("postgresql");
    wrapper.destroy();
  });

  it("fills every field a full URL names", async () => {
    const { wrapper, config, host } = mountInputs();

    await paste(host, "postgres://bob:pw@db.example.com:5433/app?sslmode=require");

    expect(config).toMatchObject({
      host: "db.example.com", port: 5433, username: "bob", password: "pw",
      defaultDatabase: "app", ssl: true,
    });
    wrapper.destroy();
  });

  it("keeps the user and password for a URL without credentials", async () => {
    const { wrapper, config, host } = mountInputs();

    await paste(host, "postgres://db.example.com:5433/app");

    expect(config.host).toBe("db.example.com");
    expect(config.username).toBe("existing_user");
    expect(config.password).toBe("existing_password");
    wrapper.destroy();
  });

  it("keeps the password when the URL names only a user", async () => {
    const { wrapper, config, host } = mountInputs();

    await paste(host, "postgres://bob@db.example.com");

    expect(config.username).toBe("bob");
    expect(config.password).toBe("existing_password");
    wrapper.destroy();
  });

  it("does not switch the connection type for another database's URL", async () => {
    const { wrapper, config, host } = mountInputs();

    await paste(host, "mysql://db.example.com:3307/app");

    expect(config.connectionType).toBe("postgresql");
    expect(config.host).toBe("db.example.com");
    expect(config.port).toBe(3307);
    wrapper.destroy();
  });

  it("leaves a plain hostname to paste as ordinary text", async () => {
    const { wrapper, config, send, host } = mountInputs();

    for (const text of ["db.example.com", "10.0.0.4", "fe80::1", "myserver\\SQL2019"]) {
      const event = await paste(host, text);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(send).not.toHaveBeenCalled();
    expect(config.host).toBe("localhost");
    expect(config.username).toBe("existing_user");
    wrapper.destroy();
  });

  it("leaves the SSMS comma form alone outside SQL Server", async () => {
    const { wrapper, config, host } = mountInputs();

    const event = await paste(host, "db.example.com,1444");

    expect(event.defaultPrevented).toBe(false);
    expect(config.port).toBe(5432);
    wrapper.destroy();
  });

  it("keeps the pasted text as the host when the parser rejects it", async () => {
    const { wrapper, config, send, host } = mountInputs();
    send.mockRejectedValueOnce(new Error("nope"));

    await paste(host, "db.example.com:5433");

    expect(config.host).toBe("db.example.com:5433");
    expect(config.port).toBe(5432);
    expect(config.username).toBe("existing_user");
    wrapper.destroy();
  });

  it("does nothing in privacy mode", async () => {
    mountInputs().wrapper.destroy();
    const { wrapper, config, send, host } = mountInputs({}, true);
    expect(host.attributes("readonly")).toBe("readonly");

    const event = await paste(host, "db.example.com:5433");

    expect(event.defaultPrevented).toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(config.host).toBe("localhost");
    wrapper.destroy();
  });
});
