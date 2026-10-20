import { describe, expect, it, vi } from "vitest";
import type { RedisClientType } from "redis";
import type { IDbConnectionServer } from "@/lib/db/backendTypes";
import type { IDbConnectionDatabase } from "@/lib/db/types";
import { RedisClient } from "@/lib/db/clients/redis";

describe("RedisClient", () => {
  it("loads key data when memory usage is unavailable", async () => {
    const client = new RedisClient(
      { config: { readOnlyMode: false } } as unknown as IDbConnectionServer,
      { database: "0" } as IDbConnectionDatabase
    );
    client.redis = {
      type: vi.fn().mockResolvedValue("string"),
      memoryUsage: vi.fn().mockRejectedValue(new Error("unknown command")),
      objectEncoding: vi.fn().mockResolvedValue("embstr"),
      get: vi.fn().mockResolvedValue("value"),
      ttl: vi.fn().mockResolvedValue(-1),
    } as unknown as RedisClientType;

    await expect(client.getKeyInfo("key")).resolves.toEqual({
      key: "key",
      value: "value",
      type: "string",
      encoding: "embstr",
      ttl: -1,
      memory: null,
    });
  });
});
