import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
import { BksFieldType } from "@/lib/db/models";
import { SqliteResult } from "@/lib/db/clients/sqlite";

export class SqliteColumnIdentifier extends ColumnIdentifier<SqliteResult> {
  protected identifyResultColumnType(column: {
    name: string;
    type?: string;
  }): BksFieldType {
    return this.identifyType(column.type);
  }

  protected identifyListedColumnType(column: RawTableColumn): BksFieldType {
    return this.identifyType(column.dataType);
  }

  // Sqlite has no strict column types, so this follows the type affinity rules.
  // See https://www.sqlite.org/datatype3.html#determination_of_column_affinity
  private identifyType(rawType?: string): BksFieldType {
    if (!rawType) {
      return "UNKNOWN";
    }

    const declaration = rawType.toLowerCase();

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
