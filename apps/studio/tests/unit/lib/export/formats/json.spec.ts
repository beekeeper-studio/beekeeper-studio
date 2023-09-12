import { Mutators } from "@/lib/data/tools";
import { DBConnection } from "@/lib/db/client";
import { TableOrView } from "@/lib/db/models";
import { JsonExporter } from "@/lib/export";

describe("json exporter", () => {
  it("Should generate json with json column properly", async () => {
    const exporter = new JsonExporter(
      "./tmp/csv.export",
      { connectionType: "mysql" } as DBConnection,
      { name: "table" } as TableOrView,
      "",
      "",
      [],
      { deleteOnAbort: true, chunkSize: 1 },
      { prettyprint: false }
    );

    const row = Mutators.mutateRow(
      [1, { a: 1 }, [{ b: 2 }, { a: 3 }]],
      ["int", "json", "json"],
      true,
      "mysql"
    );
    const result = exporter.formatRow(row);
    expect(JSON.parse(result)).toStrictEqual(
      { col_1: 1, col_2: { a: 1 }, col_3: [{ b: 2 }, { a: 3 }] },
    );
  });

  it("Should generate json value with array column properly", async () => {
    const exporter = new JsonExporter(
      "./tmp/csv.export",
      { connectionType: "postgresql" } as DBConnection,
      { name: "table" } as TableOrView,
      "",
      "",
      [],
      { deleteOnAbort: true, chunkSize: 1 },
      { prettyprint: false }
    );

    const row = Mutators.mutateRow(
      [1, ["a", "b"], [["c", "d"]]],
      ["int", "_varchar", "_varchar"],
      true,
      "mysql"
    );
    const result = exporter.formatRow(row);
    expect(JSON.parse(result)).toStrictEqual(
      {
        col_1: 1,
        col_2: ["a", "b"],
        col_3: [["c", "d"]],
      },
    );
  });
});
