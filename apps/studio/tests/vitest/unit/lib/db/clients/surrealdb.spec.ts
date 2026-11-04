import { describe, it, expect } from "vitest";
import type { IDbConnectionServer } from "@/lib/db/backendTypes";
import type { IDbConnectionDatabase } from "@/lib/db/types";
import { SurrealDBClient } from "@commercial/backend/lib/db/clients/surrealdb";

function createClient(): SurrealDBClient {
  return new SurrealDBClient(
    { config: { client: "surrealdb", readOnlyMode: false } } as unknown as IDbConnectionServer,
    { database: "test", namespace: "test" } as IDbConnectionDatabase
  );
}

describe("SurrealDBClient.applyChangesSql", () => {
  // https://github.com/beekeeper-studio/beekeeper-studio/issues/4981
  // "Copy to SQL" goes through the generic applyChangesSql, which needs a knex
  // instance. The SurrealDB client has none, so it throws `knex is not a function`.
  it("generates SurrealQL for a pending update without a knex instance", async () => {
    const client = createClient();

    const sql = await client.applyChangesSql({
      inserts: [],
      deletes: [],
      updates: [{
        table: "qa_full",
        column: "name",
        value: "beta",
        primaryKeys: [{ column: "id", value: "qa_full:1" }],
      }],
    });

    expect(sql).toMatch(/UPDATE/i);
    expect(sql).toContain("qa_full:1");
    expect(sql).toContain("name");
    expect(sql).toContain("beta");
  });

  it("generates SurrealQL for pending inserts and deletes", async () => {
    const client = createClient();

    const sql = await client.applyChangesSql({
      updates: [],
      inserts: [{ table: "qa_full", data: [{ name: "gamma" }] }],
      deletes: [{ table: "qa_full", primaryKeys: [{ column: "id", value: "qa_full:2" }] }],
    });

    expect(sql).toMatch(/CREATE|INSERT/i);
    expect(sql).toContain("gamma");
    expect(sql).toMatch(/DELETE/i);
    expect(sql).toContain("qa_full:2");
  });
});
