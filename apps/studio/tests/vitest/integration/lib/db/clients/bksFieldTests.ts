import _ from "lodash";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { BksField, BksFieldType } from "@/lib/db/models";
import { DatabaseElement } from "@/lib/db/types";

interface BksFieldTestOptions {
  connection: () => BasicDatabaseClient<any>;
  table: string;
  /** Falls back to the connection's default schema. */
  schema?: string;
  /** A string is run as a query through the connection. */
  setup: string | (() => Promise<void>);
  /** For tables dropElement can't drop, like Redis's virtual keys table. */
  skipDropTable?: boolean;
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

export function runBksFieldTests(options: BksFieldTestOptions) {
  describe("BksField tests", () => {
    beforeAll(async () => {
      if (typeof options.setup === "string") {
        await options.connection().executeQuery(options.setup);
      } else {
        await options.setup();
      }
    });

    afterAll(async () => {
      if (options.skipDropTable) {
        return;
      }
      const connection = options.connection();
      const schema = options.schema ?? (await connection.defaultSchema());
      await connection.dropElement(
        options.table,
        DatabaseElement.TABLE,
        schema
      );
    });

    it("should report a bksType for every listed column", async () => {
      const connection = options.connection();
      const schema = options.schema ?? (await connection.defaultSchema());
      const columns = await connection.listTableColumns(
        options.table,
        schema
      );
      const fields = columns.map((c) => c.bksField);

      expect(columnsByBksType(fields)).toEqual(options.expectedResults);
    });

    it("should report a bksType for every result column", async () => {
      const connection = options.connection();
      const schema = options.schema ?? (await connection.defaultSchema());
      const result = await connection.selectTop(
        options.table,
        0,
        10,
        [],
        [],
        schema
      );

      expect(columnsByBksType(result.fields)).toEqual(
        options.expectedResults
      );
    });
  });
}
