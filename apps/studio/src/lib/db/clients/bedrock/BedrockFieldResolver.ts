import { BksFieldType } from "@/lib/db/models";
import { RawTableColumn } from "@/lib/db/serialization/FieldResolver";
import { MysqlFieldResolver } from "@/lib/db/clients/mysql/MySqlFieldResolver";

/**
 * Bedrock speaks the MySQL protocol, so result columns are identified the MySQL
 * way, but its listed columns come from sqlite's `PRAGMA table_xinfo`.
 */
export class BedrockFieldResolver extends MysqlFieldResolver {
  // Sqlite has no strict column types, so this follows the type affinity rules.
  // See https://www.sqlite.org/datatype3.html#determination_of_column_affinity
  protected resolveDeclaredColumnType(column: RawTableColumn): BksFieldType {
    if (!column.dataType) {
      return "UNKNOWN";
    }

    const declaration = column.dataType.toLowerCase();

    if (/bool/.test(declaration)) {
      return "BOOLEAN";
    }

    if (/date|time/.test(declaration)) {
      return "DATETIME";
    }

    if (/blob/.test(declaration)) {
      return "BINARY";
    }

    if (/char|clob|text|string/.test(declaration)) {
      return "STRING";
    }

    if (/int|real|floa|doub|num|dec/.test(declaration)) {
      return "NUMBER";
    }

    return "UNKNOWN";
  }
}
