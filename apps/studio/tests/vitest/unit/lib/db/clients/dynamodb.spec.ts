import { describe, it, expect, vi } from "vitest";
import { DynamoDBClient } from "@commercial/backend/lib/db/clients/dynamodb";
import type { IDbConnectionServer } from "@/lib/db/backendTypes";
import type { IDbConnectionDatabase } from "@/lib/db/types";

describe("DynamoDBClient.executeQuery read-only", () => {
  function createClient(readOnlyMode = false) {
    const client = new DynamoDBClient(
      { config: { readOnlyMode } } as unknown as IDbConnectionServer,
      { database: "" } as IDbConnectionDatabase
    );
    const send = vi.fn().mockResolvedValue({ Items: [{ id: 1 }] });
    client.doc = { send } as any;
    return { client, send };
  }

  it("runs reads on a writable connection", async () => {
    const { client, send } = createClient();

    const [result] = await client.executeQuery(`SELECT * FROM "users"`);

    expect(send).toHaveBeenCalledTimes(1);
    expect(result.rows).toStrictEqual([{ id: 1 }]);
  });

  it("runs writes on a writable connection", async () => {
    const { client, send } = createClient();

    await client.executeQuery(`DELETE FROM "users" WHERE "id" = 1`);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("allows reads when forceReadOnly is set", async () => {
    const { client, send } = createClient();

    await client.executeQuery(`SELECT * FROM "users"`, { forceReadOnly: true });

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("blocks writes when forceReadOnly is set", async () => {
    const { client, send } = createClient();

    await expect(
      client.executeQuery(`DELETE FROM "users" WHERE "id" = 1`, { forceReadOnly: true })
    ).rejects.toThrow(/Read-Only Mode/);
    expect(send).not.toHaveBeenCalled();
  });

  it("blocks writes on a read-only connection", async () => {
    const { client, send } = createClient(true);

    await expect(
      client.executeQuery(`DELETE FROM "users" WHERE "id" = 1`)
    ).rejects.toThrow(/Read-Only Mode/);
    expect(send).not.toHaveBeenCalled();
  });
});
