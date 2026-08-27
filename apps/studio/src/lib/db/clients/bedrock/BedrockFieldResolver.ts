/**
 * Reference for data types:
 * https://dev.mysql.com/doc/refman/8.4/en/data-types.html (result columns)
 * https://www.sqlite.org/datatype3.html (listed columns)
 */

import { RawTableColumn } from "@/lib/db/serialization/FieldResolver";
import { MysqlFieldResolver } from "@/lib/db/clients/mysql/MySqlFieldResolver";

const regex = {
  binary: /blob/,
  string: /char|clob|text|string/,
  number: /int|real|floa|doub|num|dec/,
  datetime: /date|time/,
  boolean: /bool/,
};

/**
 * Bedrock speaks the MySQL protocol, so result columns are identified the MySQL
 * way, but its listed columns come from sqlite's `PRAGMA table_xinfo`.
 */
export class BedrockFieldResolver extends MysqlFieldResolver {
  // Sqlite has no strict column types, so this follows the type affinity rules.
  protected resolveDeclaredColumnType(column: RawTableColumn) {
    if (!column.dataType) {
      return "UNKNOWN";
    }

    const declaration = column.dataType.toLowerCase();

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
