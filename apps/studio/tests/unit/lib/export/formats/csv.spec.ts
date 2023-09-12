import { DBConnection } from "@/lib/db/client";
import { TableOrView } from "@/lib/db/models";
import { CsvExporter } from "@/lib/export";
import Papa from "papaparse";

describe("csv exporter", () => {
  it("Should generate csv with json column properly", async () => {
    const exporter = new CsvExporter(
      "./tmp/csv.export",
      { connectionType: "mysql" } as DBConnection,
      { name: "table" } as TableOrView,
      "",
      "",
      [],
      { deleteOnAbort: true, chunkSize: 1 },
      { header: false, delimiter: "," }
    );

    const result = exporter.formatRow([1, '{"a": 1}', '[{"b":2},{"a":3}]']);
    expect(Papa.parse(result).data).toStrictEqual([
      ["1", '{"a": 1}', '[{"b":2},{"a":3}]'],
    ]);
  });

  it("Should generate csv value with array column properly", async () => {
    const exporter = new CsvExporter(
      "./tmp/csv.export",
      { connectionType: "postgresql" } as DBConnection,
      { name: "table" } as TableOrView,
      "",
      "",
      [],
      { deleteOnAbort: true, chunkSize: 1 },
      { header: false, delimiter: "," }
    );

    const result = exporter.formatRow([1, "{1,2}", '{{"a","b"},{"c","d"}}']);
    expect(Papa.parse(result).data).toStrictEqual([
      ["1", "{1,2}", '{{"a","b"},{"c","d"}}'],
    ]);
  });
});
