import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { DateTime, Decimal, Duration, GeometryPoint, RecordId, Uuid, ValueFrame } from "surrealdb";
import { SurrealDBCursor } from "@commercial/backend/lib/db/clients/surrealdb/SurrealDBCursor";
import { CsvExporter } from "@/lib/export/formats/csv";
import { JsonExporter } from "@/lib/export/formats/json";
import type { TableColumn } from "@/lib/db/models";

// A pool whose connection streams `values` back as value frames, the way
// `conn.query(sql).stream()` does for a SELECT.
function cursorFor(values: unknown[], chunkSize = 100): SurrealDBCursor {
  const conn = {
    query: () => ({
      async *stream() {
        for (const value of values) {
          yield new ValueFrame<unknown, false>(0, value, false);
        }
      },
    }),
    release: async () => undefined,
  };
  const pool = { connect: async () => conn };
  return new SurrealDBCursor({ query: "SELECT * FROM qa_full", conn: pool as any, chunkSize });
}

async function readAll(cursor: SurrealDBCursor): Promise<any[][]> {
  const rows: any[][] = [];
  await cursor.start();
  for (;;) {
    const chunk = await cursor.read();
    if (chunk.length === 0) break;
    rows.push(...chunk);
  }
  await cursor.close();
  return rows;
}

// `CREATE qa_full:1 SET name = 'alpha', n = 1` from the issue
const qaFull = () => ({ id: new RecordId("qa_full", 1), n: 1, name: "alpha" });

const qaFullColumns: TableColumn[] = [
  { columnName: "id", dataType: "string" },
  { columnName: "n", dataType: "int" },
  { columnName: "name", dataType: "string" },
];

describe("SurrealDBCursor", () => {
  it("returns record ids as table:id strings", async () => {
    expect(await readAll(cursorFor([qaFull()]))).toEqual([["qa_full:1", 1, "alpha"]]);
  });

  it("converts record links nested in arrays and objects", async () => {
    const rows = await readAll(cursorFor([{
      id: new RecordId("person", "tobie"),
      address_history: [new RecordId("address", 1), new RecordId("address", 2)],
      owner: { ref: new RecordId("user", "jaime") },
    }]));

    expect(rows).toEqual([[
      "person:tobie",
      ["address:1", "address:2"],
      { ref: "user:jaime" },
    ]]);
  });

  it("converts other SurrealDB values to plain values", async () => {
    const rows = await readAll(cursorFor([{
      created: new DateTime("2026-11-02T11:28:37Z"),
      ttl: new Duration("1h30m"),
      price: new Decimal("19.99"),
      uuid: new Uuid("0193b5ad-1c3f-7c5e-9a77-6c2f1d0e8a10"),
      location: new GeometryPoint([53.38, -2.35]),
    }]));

    expect(rows).toEqual([[
      "2026-11-02T11:28:37.000Z",
      "1h30m",
      "19.99",
      "0193b5ad-1c3f-7c5e-9a77-6c2f1d0e8a10",
      { type: "Point", coordinates: [53.38, -2.35] },
    ]]);
  });

  it("leaves plain values alone and keeps every cell in place", async () => {
    const rows = await readAll(cursorFor([{ a: null, b: undefined, c: "x", d: 2, e: true }]));
    expect(rows).toEqual([[null, undefined, "x", 2, true]]);
  });

  it("treats a bare record id (SELECT VALUE id) as one value, not a row", async () => {
    const cursor = cursorFor([new RecordId("qa_full", 1)]);
    const rows = await readAll(cursor);

    expect(cursor.columns).toEqual([{ columnName: "value", dataType: "unknown" }]);
    expect(rows).toEqual([["qa_full:1"]]);
  });
});

// https://github.com/beekeeper-studio/beekeeper-studio/issues/4986
describe("SurrealDB table export", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "bks-surreal-export-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function connection() {
    return {
      connectionType: "surrealdb",
      selectTopStream: async () => ({
        totalRows: 1,
        columns: qaFullColumns,
        cursor: cursorFor([qaFull()]),
      }),
    } as any;
  }

  const options = { chunkSize: 100, deleteOnAbort: false };

  it("writes record ids to CSV without extra quotes", async () => {
    const file = path.join(dir, "qa_full.csv");
    const exporter = new CsvExporter(
      file, connection(), { name: "qa_full" } as any, "", "", [], options,
      { header: true, delimiter: "," }, false
    );

    await exporter.exportToFile();

    expect(exporter.error).toBeNull();
    expect(fs.readFileSync(file, "utf-8")).toEqual("id,n,name\nqa_full:1,1,alpha\n");
  });

  it("writes record ids to JSON as strings", async () => {
    const file = path.join(dir, "qa_full.json");
    const exporter = new JsonExporter(
      file, connection(), { name: "qa_full" } as any, "", "", [], options,
      { prettyprint: false }, false
    );

    await exporter.exportToFile();

    expect(exporter.error).toBeNull();
    expect(JSON.parse(fs.readFileSync(file, "utf-8"))).toEqual([
      { id: "qa_full:1", n: 1, name: "alpha" },
    ]);
  });
});
