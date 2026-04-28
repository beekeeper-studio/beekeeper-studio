import fs from "fs";
import os from "os";
import path from "path";

const mockTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-ai-log-"));
jest.mock("@/common/platform_info", () => ({ __esModule: true, default: { userDirectory: mockTmpDir } }));

import { configure, append, recent, clear, subscribe } from "@commercial/backend/ai-server/queryLog";

beforeEach(() => {
  clear();
  configure({ ringBufferSize: 10, persist: false });
});

describe("ai-server/queryLog", () => {
  it("ring buffer caps stored entries", () => {
    for (let i = 0; i < 25; i++) {
      append({
        connectionId: 1, connectionName: "x", database: null,
        sql: `SELECT ${i}`, rowCount: 0, truncated: false, durationMs: 1, readOnly: true,
      });
    }
    const r = recent();
    expect(r.length).toBe(10);
    expect(r[0].sql).toBe("SELECT 15");
    expect(r[9].sql).toBe("SELECT 24");
  });

  it("subscribers receive each append and unsubscribe works", () => {
    const seen: string[] = [];
    const off = subscribe((e) => seen.push(e.sql));
    append({ connectionId: 1, connectionName: "x", database: null, sql: "a", rowCount: 0, truncated: false, durationMs: 0, readOnly: true });
    append({ connectionId: 1, connectionName: "x", database: null, sql: "b", rowCount: 0, truncated: false, durationMs: 0, readOnly: true });
    off();
    append({ connectionId: 1, connectionName: "x", database: null, sql: "c", rowCount: 0, truncated: false, durationMs: 0, readOnly: true });
    expect(seen).toEqual(["a", "b"]);
  });

  it("recent({ since }) filters by timestamp", () => {
    const before = Date.now();
    const e1 = append({ connectionId: 1, connectionName: "x", database: null, sql: "a", rowCount: 0, truncated: false, durationMs: 0, readOnly: true });
    const filtered = recent({ since: before - 1 });
    expect(filtered).toContainEqual(e1);
    expect(recent({ since: Date.now() + 1000 })).toEqual([]);
  });

  it("persistence writes JSONL when enabled", () => {
    configure({ ringBufferSize: 10, persist: true });
    append({ connectionId: 1, connectionName: "x", database: null, sql: "SELECT 1", rowCount: 0, truncated: false, durationMs: 0, readOnly: true });
    const log = path.join(mockTmpDir, "ai-server.log.jsonl");
    expect(fs.existsSync(log)).toBe(true);
    const lines = fs.readFileSync(log, "utf8").trim().split("\n");
    expect(lines.length).toBeGreaterThan(0);
    expect(JSON.parse(lines[lines.length - 1])).toMatchObject({ sql: "SELECT 1" });
  });
});
