/**
 * Reference for data types:
 * https://www.sqlite.org/datatype3.html
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { ResultColumn, SqliteResult } from "@/lib/db/clients/sqlite";

const regex = {
  binary: /blob/,
  string: /char|clob|text|string/,
  number: /int|real|floa|doub|num|dec/,
  datetime: /date|time/,
  boolean: /bool/,
};

export class SqliteFieldResolver extends FieldResolver<SqliteResult> {
  protected resolveRuntimeColumnType(column: ResultColumn) {
    return this.identifyType(column.type);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    return this.identifyType(column.dataType);
  }

  // Sqlite has no strict column types, so this follows the type affinity rules.
  private identifyType(rawType?: string): BksFieldType {
    if (!rawType) {
      return "UNKNOWN";
    }

    const declaration = rawType.toLowerCase();

    if (regex.binary.test(declaration)) {
      return "BINARY";
    }

    if (regex.string.test(declaration)) {
      return "STRING";
    }

    if (regex.number.test(declaration)) {
      return "NUMBER";
    }

    if (regex.datetime.test(declaration)) {
      return "DATETIME";
    }

    if (regex.boolean.test(declaration)) {
      return "BOOLEAN";
    }

    return "UNKNOWN";
  }
}
