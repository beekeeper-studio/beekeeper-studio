import { describe, it, expect } from "vitest";
import { Readable } from "stream";
import * as cassandra from "cassandra-driver";
import { CassandraCursor } from "@commercial/backend/lib/db/clients/cassandra/CassandraCursor";

const { dataTypes, Uuid, TimeUuid, Long } = cassandra.types;
// Row is exported at runtime but missing from the driver typings
const Row = (cassandra.types as any).Row;

const ID = "c9d93d03-8770-4524-994f-61fa454d2c62";

const columns = [
  { name: "id", type: { code: dataTypes.uuid } },
  { name: "created", type: { code: dataTypes.timeuuid } },
  { name: "total", type: { code: dataTypes.bigint } },
  { name: "alpha", type: { code: dataTypes.text } },
];

// Rows built the same way the driver's result stream builds them.
function driverRow(values: Record<string, unknown>) {
  const row = new Row(columns);
  Object.entries(values).forEach(([k, v]) => (row[k] = v));
  return row;
}

function cursorFor(rows: unknown[]): CassandraCursor {
  const connection = { stream: () => Readable.from(rows) };
  return new CassandraCursor(connection, "select * from store.qa_items", [], 100);
}

async function readAll(cursor: CassandraCursor): Promise<any[][]> {
  const result: any[][] = [];
  await cursor.start();
  for (;;) {
    const chunk = await cursor.read();
    if (chunk.length === 0) break;
    result.push(...chunk);
  }
  return result;
}

describe("CassandraCursor", () => {
  it("converts driver values the same way query results are converted", async () => {
    const created = TimeUuid.now();
    const rows = await readAll(cursorFor([
      driverRow({
        id: Uuid.fromString(ID),
        created,
        total: Long.fromString("9007199254740993"),
        alpha: "plain",
      }),
    ]));

    expect(rows).toContainEqual([ID, created.toString(), "9007199254740993", "plain"]);
  });

  it("keeps nulls as null", async () => {
    const rows = await readAll(cursorFor([
      driverRow({ id: Uuid.fromString(ID), created: null, total: null, alpha: null }),
    ]));

    expect(rows).toContainEqual([ID, null, null, null]);
  });
});
