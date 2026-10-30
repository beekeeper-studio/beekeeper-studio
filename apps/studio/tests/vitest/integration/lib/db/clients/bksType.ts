import _ from "lodash";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { BksField, BksFieldType } from "@/lib/db/models";

interface BksTypeTestOptions {
  connection: () => BasicDatabaseClient<any>;
  table: string;
  /** Column names grouped by the bksType they should report. */
  expectedResults: Record<BksFieldType, string[]>;
}

function columnsByBksType(
  fields: BksField[]
): Partial<Record<BksFieldType, string[]>> {
  const groups = _.groupBy(fields, "bksType");
  const values = _.mapValues(groups, (group) => group.map((f) => f.name));
  return {
    BINARY: [],
    STRING: [],
    NUMBER: [],
    DATETIME: [],
    BOOLEAN: [],
    OBJECTID: [],
    SURREALID: [],
    UNKNOWN: [],
    ...values,
  };
}

export function runBksTypeTests(options: BksTypeTestOptions) {
  it("should report a bksType for every listed column", async () => {
    const connection = options.connection();
    const schema = await connection.defaultSchema();
    const columns = await connection.listTableColumns(options.table, schema);
    const fields = columns.map((c) => c.bksField);

    expect(columnsByBksType(fields)).toEqual(options.expectedResults);
  });

  it("should report a bksType for every result column", async () => {
    const connection = options.connection();
    const schema = await connection.defaultSchema();
    const result = await connection.selectTop(
      options.table,
      0,
      10,
      [],
      [],
      schema
    );

    expect(columnsByBksType(result.fields)).toEqual(options.expectedResults);
  });
}
