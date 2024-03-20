import { DBTestUtil } from "../../../../lib/db";
import tmp from "tmp";
import { runCommonTests } from "./all";
import { IDbConnectionServerConfig } from "@/lib/db/types";
import path from "path";

describe("Sqlite Tests", () => {
  let dbfile: any;
  let dbdir: any;
  let filepath: string;
  let util: DBTestUtil;

  beforeAll(async () => {
    // dbfile = tmp.fileSync({ name: 'database.db' })
    dbdir = tmp.dirSync();
    // console.log(dbdir.name, dbfile.name)
    filepath = path.join(dbdir.name, "duckdb.db");
    // filepath = dbfile.name

    // @ts-ignore
    const config: IDbConnectionServerConfig = {
      client: "duckdb",
    };

    const options: DBTestUtil["options"] = {
      dialect: "duckdb",
      defaultSchema: "main",
      async beforeCreatingTables() {
        const sequences = [
          "seq_addresses_id",
          "seq_MixedCase_id",
          "seq_group_table_id",
          "seq_people_id",
          "seq_streamtest_id",
          "seq_jobs_id",
        ];
        const query = sequences
          .map((seq) => `CREATE SEQUENCE ${seq} START 1`)
          .join(";");
        await util.knex.schema.raw(query);
      },
      autoIncrementingPKType(tableName) {
        return `INTEGER PRIMARY KEY DEFAULT nextval('seq_${tableName}_id')`;
      },

      // There should be only one process that can both read and write to
      // the database.
      singleClient: true,

      // DuckDB supports generated columns, but there's no specific
      // information whether a column is generated or not. Be aware that we
      // can get the definition of it from the default value.
      skipGeneratedColumns: true,
    };

    util = new DBTestUtil(config, filepath, options);
    await util.setupdb();
  });

  afterAll(async () => {
    if (util.connection) {
      await util.connection.disconnect();
    }

    if (dbfile) {
      dbfile.removeCallback();
    }
    if (dbdir) {
      dbdir.removeCallback();
    }
  });

  describe("Common Tests", () => {
    runCommonTests(() => util);
  });
});
