import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import { PluginData } from "@/common/appdb/models/PluginData";
import { EncryptedPluginData } from "@/common/appdb/models/EncryptedPluginData";
import { PluginHandlers } from "@commercial/backend/handlers/pluginHandlers";
import { newState, removeState, state } from "@/handlers/handlerState";
import { IConnection } from "@/common/interfaces/IConnection";

const SID = "plugin-data-scope";

describe.each([
  { name: "PluginData", Model: PluginData },
  { name: "EncryptedPluginData", Model: EncryptedPluginData },
])("$name", ({ Model }) => {
  beforeAll(async () => {
    await TestOrmConnection.connect();
  });

  afterAll(async () => {
    await TestOrmConnection.disconnect();
  });

  beforeEach(async () => {
    await Model.clear();
  });

  it.each([
    { type: "true", value: true },
    { type: "false", value: false },
    { type: "zero", value: 0 },
    { type: "number", value: 42.5 },
    { type: "null", value: null },
    { type: "empty string", value: "" },
    { type: "array", value: [1, "two", false] },
    { type: "object", value: { name: "hello world", nested: { count: 3 } } },
  ])("round-trips $type", async ({ value }) => {
    await Model.set("test-plugin", "key", value);

    await expect(Model.get("test-plugin", "key")).resolves.toEqual(value);
  });

  it("keeps unscoped, workspace and connection values apart", async () => {
    await Model.set("test-plugin", "key", "global");
    await Model.set("test-plugin", "key", "workspace", { workspaceId: 1 });
    await Model.set("test-plugin", "key", "connection", {
      connectionId: 2,
      workspaceId: 1,
    });

    await expect(Model.get("test-plugin", "key")).resolves.toBe("global");
    await expect(
      Model.get("test-plugin", "key", { workspaceId: 1 })
    ).resolves.toBe("workspace");
    await expect(
      Model.get("test-plugin", "key", { connectionId: 2, workspaceId: 1 })
    ).resolves.toBe("connection");
  });

  it("keeps different connections apart", async () => {
    await Model.set("test-plugin", "key", "first connection value", {
      connectionId: 1,
      workspaceId: 1,
    });
    await Model.set("test-plugin", "key", "second connection value", {
      connectionId: 2,
      workspaceId: 1,
    });

    await expect(
      Model.get("test-plugin", "key", { connectionId: 1, workspaceId: 1 })
    ).resolves.toBe("first connection value");
    await expect(
      Model.get("test-plugin", "key", { connectionId: 2, workspaceId: 1 })
    ).resolves.toBe("second connection value");
  });

  it("does not return scoped values to an unscoped get", async () => {
    await Model.set("test-plugin", "key", "connection", {
      connectionId: 1,
      workspaceId: 1,
    });

    await expect(Model.get("test-plugin", "key")).resolves.toBeNull();
  });

  it("updates an existing scoped row instead of inserting", async () => {
    const options = { connectionId: 1, workspaceId: 1 };
    await Model.set("test-plugin", "key", "first", options);
    await Model.set("test-plugin", "key", "second", options);

    await expect(Model.get("test-plugin", "key", options)).resolves.toBe(
      "second"
    );
    await expect(Model.count()).resolves.toBe(1);
  });
});

describe("plugin data handler scopes", () => {
  const currentConnection = { id: 3, workspaceId: 7 } as IConnection;
  const handlers = PluginHandlers(null);
  const manifest = { id: "test-plugin" } as any;

  beforeAll(async () => {
    await TestOrmConnection.connect();
  });

  afterAll(async () => {
    await TestOrmConnection.disconnect();
  });

  beforeEach(async () => {
    await PluginData.clear();
    await EncryptedPluginData.clear();
    newState(SID);
    state(SID).usedConfig = currentConnection;
  });

  afterEach(() => {
    removeState(SID);
  });

  it("currentConnection stores the connection and workspace ids", async () => {
    await handlers["plugin/setData"]({
      sId: SID,
      manifest,
      key: "key",
      value: "hello world",
      scope: "currentConnection",
    });

    const row = await PluginData.findOne({
      where: { pluginId: "test-plugin" },
    });
    expect(row.connectionId).toBe(3);
    expect(row.workspaceId).toBe(7);
    const value = await handlers["plugin/getData"]({
      sId: SID,
      manifest,
      key: "key",
      scope: "currentConnection",
    });
    expect(value).toBe("hello world");
  });

  it("currentWorkspace stores only the workspace id", async () => {
    await handlers["plugin/setEncryptedData"]({
      sId: SID,
      manifest,
      key: "key",
      value: "hello world",
      scope: "currentWorkspace",
    });

    const row = await EncryptedPluginData.findOne({
      where: { pluginId: "test-plugin" },
    });
    expect(row.connectionId).toBeNull();
    expect(row.workspaceId).toBe(7);
    const value = await handlers["plugin/getEncryptedData"]({
      sId: SID,
      manifest,
      key: "key",
      scope: "currentWorkspace",
    });
    expect(value).toBe("hello world");
  });

  it("no scope stores neither id", async () => {
    await handlers["plugin/setData"]({
      sId: SID,
      manifest,
      key: "key",
      value: "hello world",
    });

    const row = await PluginData.findOne({
      where: { pluginId: "test-plugin" },
    });
    expect(row.connectionId).toBeNull();
    expect(row.workspaceId).toBeNull();
  });

  it.each(["currentConnection", "currentWorkspace"] as const)(
    "%s throws without an active connection",
    async (scope) => {
      state(SID).usedConfig = null;

      await expect(
        handlers["plugin/getData"]({ sId: SID, manifest, key: "key", scope })
      ).rejects.toThrow("requires an active connection");
    }
  );

  it("throws on an unknown scope", async () => {
    await expect(
      handlers["plugin/getData"]({
        sId: SID,
        manifest,
        key: "key",
        scope: "bogus" as any,
      })
    ).rejects.toThrow("Unknown plugin data scope");
  });
});
