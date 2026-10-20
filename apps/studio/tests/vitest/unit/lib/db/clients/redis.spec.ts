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
