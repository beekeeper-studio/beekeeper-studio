/**
 * Reference for data types:
 * https://surrealdb.com/docs/surrealql/datamodel
 */

import { RecordId } from "surrealdb";
import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { ResultColumn, SurrealDBQueryResult } from "../surrealdb";

const regex = {
  binary: /^bytes$/,
  string: /^(?:string|uuid)$/,
  number: /^(?:int|float|decimal|number)$/,
  datetime: /^(?:datetime|duration)$/,
  boolean: /^bool$/,
};

export class SurrealDBFieldResolver extends FieldResolver<SurrealDBQueryResult> {
  // Surreal reports no types for a result, so the values decide.
  // TODO (@day): may need to do some analysis here
  protected resolveRuntimeColumnType(
    column: ResultColumn,
    queryResult: SurrealDBQueryResult
  ) {
    const row = queryResult.rows[0];
    const value = row?.[column.name];

    if (value instanceof RecordId) {
      return "SURREALID";
    }
    return "UNKNOWN";
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    if (column.dataType?.startsWith("record<") || column.columnName === "id") {
      return "SURREALID";
    }

    // option<string> wraps the type we actually care about.
    const declaration = column.dataType?.toLowerCase() ?? "";
    const type = declaration
      .replace(/^option<(.*)>$/, "$1")
      .split("<")[0]
      .trim();

    if (regex.binary.test(type)) {
      return "BINARY";
    }

    if (regex.string.test(type)) {
      return "STRING";
    }

    if (regex.number.test(type)) {
      return "NUMBER";
    }

    if (regex.datetime.test(type)) {
      return "DATETIME";
    }

    if (regex.boolean.test(type)) {
      return "BOOLEAN";
    }

    return "UNKNOWN";
  }
}
