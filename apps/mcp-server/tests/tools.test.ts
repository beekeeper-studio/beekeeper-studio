import { test } from "node:test";
import assert from "node:assert/strict";
import { listTools, callTool, TOOLS } from "../src/tools.ts";
import { ApiClient } from "../src/api.ts";

class FakeClient extends ApiClient {
  calls: Array<{ method: string; path: string; body?: unknown; query?: Record<string, unknown> }> = [];
  constructor() {
    super({ discovery: { version: 1, host: "127.0.0.1", port: 1, token: "t", pid: 1, appVersion: "x", startedAt: "" } });
  }
  // @ts-expect-error override
  async request(method: string, path: string, body?: unknown, query?: Record<string, unknown>) {
    this.calls.push({ method, path, body, query });
    return { ok: true };
  }
}

test("listTools returns at least the core endpoints", () => {
  const names = listTools().map((t) => t.name).sort();
  for (const required of ["list_connections", "run_query", "sample_table", "list_tables"]) {
    assert.ok(names.includes(required), `missing tool ${required}`);
  }
});

test("run_query sends sql and connectionId", async () => {
  const api = new FakeClient();
  await callTool("run_query", { connectionId: 7, sql: "SELECT 1" }, api);
  const last = api.calls.at(-1)!;
  assert.equal(last.method, "POST");
  assert.equal(last.path, "/v1/connections/7/query");
  assert.deepEqual(last.body, { sql: "SELECT 1", maxRows: undefined });
});

test("sample_table forwards limit and schema", async () => {
  const api = new FakeClient();
  await callTool("sample_table", { connectionId: 3, table: "users", schema: "public", limit: 25 }, api);
  const last = api.calls.at(-1)!;
  assert.equal(last.method, "GET");
  assert.equal(last.path, "/v1/connections/3/tables/users/sample");
  assert.deepEqual(last.query, { schema: "public", limit: 25 });
});

test("unknown tool throws", async () => {
  await assert.rejects(() => callTool("nope", {}, new FakeClient()));
});
