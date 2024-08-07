import knexlib from "knex";
import { makeEscape } from "knex/lib/util/string";
import { makeString } from "@/common/utils";

export function createSQLiteKnex(client: any = "better-sqlite3") {
  const knex = knexlib({
    client: client,
    // silence the "sqlite does not support inserting default values" warnings on every insert
    useNullAsDefault: true,
  });

  // HACK (day): this is to prevent the 'str.replace is not a function' error that seems to happen with all changes.
  knex.client = Object.assign(knex.client, {
    _escapeBinding: makeEscape({
      escapeString(str: any) {
        str = makeString(str);
        return str ? `'${str.replace(/'/g, "''")}'` : "";
      },
    }),
  });

  return knex;
}
