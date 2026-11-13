import { describe, expect, it, vi } from "vitest";
import type { RedisClientType } from "redis";
import type { IDbConnectionServer } from "@/lib/db/backendTypes";
import type { IDbConnectionDatabase } from "@/lib/db/types";
import { RedisClient } from "@/lib/db/clients/redis";

describe("RedisClient.getKeyInfo", () => {
  function createClient(memoryUsage: RedisClientType["memoryUsage"]) {
    const client = new RedisClient(
      { config: { readOnlyMode: false } } as unknown as IDbConnectionServer,
      { database: "0" } as IDbConnectionDatabase
    );
    client.redis = {
      type: vi.fn().mockResolvedValue("string"),
      memoryUsage,
      objectEncoding: vi.fn().mockResolvedValue("embstr"),
      get: vi.fn().mockResolvedValue("value"),
      ttl: vi.fn().mockResolvedValue(-1),
    } as unknown as RedisClientType;
    return client;
  }

  it("returns null memory when MEMORY USAGE is unsupported", async () => {
    const memoryUsage = vi
      .fn()
      .mockRejectedValue(new Error("ERR unknown command 'MEMORY'"));
    const client = createClient(memoryUsage);

    const info = await client.getKeyInfo("mykey");

    expect(memoryUsage).toHaveBeenCalledWith("mykey");
    expect(info).toEqual({
      key: "mykey",
      value: "value",
      type: "string",
      encoding: "embstr",
      ttl: -1,
      memory: null,
    });
  });

  it("returns memory when MEMORY USAGE is supported", async () => {
    const client = createClient(vi.fn().mockResolvedValue(56));

    const info = await client.getKeyInfo("mykey");

    expect(info.memory).toBe(56);
  });
});

describe("RedisClient read-only commands", () => {
  function createClient(readOnlyMode = false) {
    const client = new RedisClient(
      { config: { readOnlyMode } } as unknown as IDbConnectionServer,
      { database: "0" } as IDbConnectionDatabase
    );
    const sendCommand = vi.fn().mockResolvedValue("OK");
    client.redis = {
      hello: vi.fn().mockResolvedValue({ proto: 2 }),
      sendCommand,
    } as unknown as RedisClientType;
    return { client, sendCommand };
  }

  it("blocks write commands when forceReadOnly is set", async () => {
    const { client, sendCommand } = createClient();

    const [result] = await client.executeQuery("SET foo bar", { forceReadOnly: true });

    expect(sendCommand).not.toHaveBeenCalled();
    expect(result.rows[0].error).toContain("not allowed in Read-Only mode");
  });

  it("allows read commands when forceReadOnly is set", async () => {
    const { client, sendCommand } = createClient();

    await client.executeQuery("GET foo", { forceReadOnly: true });

    expect(sendCommand).toHaveBeenCalledWith(["GET", "foo"]);
  });

  it("runs write commands when no options are passed", async () => {
    const { client, sendCommand } = createClient();

    await client.executeQuery("SET foo bar");

    expect(sendCommand).toHaveBeenCalledWith(["SET", "foo", "bar"]);
  });

  it("runs write commands from the query editor path, which passes no options", async () => {
    const { client, sendCommand } = createClient();

    const query = await client.query("SET foo bar");
    await query.execute();

    expect(sendCommand).toHaveBeenCalledWith(["SET", "foo", "bar"]);
  });
});

describe("RedisClient.executeApplyChanges inserts", () => {
  function createClient() {
    const client = new RedisClient(
      { config: { readOnlyMode: false } } as unknown as IDbConnectionServer,
      { database: "0" } as IDbConnectionDatabase
    );
    const redis = {
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
      hSet: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(true),
    };
    client.redis = redis as unknown as RedisClientType;
    return { client, redis };
  }

  function insert(row: Record<string, unknown>) {
    return {
      inserts: [{ table: "keys", data: [row] }],
      updates: [],
      deletes: [],
    };
  }

  it("writes the value typed in the new row", async () => {
    const { client, redis } = createClient();

    await client.executeApplyChanges(
      insert({ key: "qa:newkey", value: "hello world", ttl: null })
    );

    expect(redis.set).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith("qa:newkey", "hello world");
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it("creates an empty string key when the row has no value", async () => {
    const { client, redis } = createClient();

    await client.executeApplyChanges(insert({ key: "qa:empty", value: null }));

    expect(redis.set).toHaveBeenCalledWith("qa:empty", "");
  });

  it("stores a JSON object value as a hash", async () => {
    const { client, redis } = createClient();

    await client.executeApplyChanges(
      insert({ key: "qa:hash", value: '{"name":"John"}' })
    );

    expect(redis.set).not.toHaveBeenCalled();
    expect(redis.hSet).toHaveBeenCalledWith("qa:hash", "name", "John");
  });

  it("applies the TTL typed in the new row", async () => {
    const { client, redis } = createClient();

    await client.executeApplyChanges(
      insert({ key: "qa:ttl", value: "v", ttl: "60" })
    );

    expect(redis.set).toHaveBeenCalledWith("qa:ttl", "v");
    expect(redis.expire).toHaveBeenCalledWith("qa:ttl", 60);
  });
});
