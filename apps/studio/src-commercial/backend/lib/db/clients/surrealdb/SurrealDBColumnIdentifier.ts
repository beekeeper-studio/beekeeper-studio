import { RecordId } from "surrealdb";
import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
import { BksField, BksFieldType } from "@/lib/db/models";
import { SurrealDBQueryResult } from "../surrealdb";

const numberTypes = ["int", "float", "decimal", "number"];

const dateTimeTypes = ["datetime", "duration"];

const stringTypes = ["string", "uuid"];

export class SurrealDBColumnIdentifier extends ColumnIdentifier<SurrealDBQueryResult> {
  // Surreal reports no types for a result, so the values decide.
  identifyResultColumns(qr: SurrealDBQueryResult): BksField[] {
    const row = qr.rows[0];
    return qr.columns.map((column) => {
      let bksType: BksFieldType = "UNKNOWN";
      if (row?.[column.name] instanceof RecordId) {
        bksType = "SURREALID";
      }
      // TODO (@day): may need to do some analysis here
      return { name: column.name, bksType };
    });
  }

  protected identifyListedColumnType(column: RawTableColumn): BksFieldType {
    if (column.dataType?.startsWith("record<") || column.columnName === "id") {
      return "SURREALID";
    }

    // option<string> wraps the type we actually care about.
    const declaration = column.dataType?.toLowerCase() ?? "";
    const type = declaration
      .replace(/^option<(.*)>$/, "$1")
      .split("<")[0]
      .trim();

    if (type === "bool") {
      return "BOOLEAN";
    }

    if (type === "bytes") {
      return "BINARY";
    }

    if (numberTypes.includes(type)) {
      return "NUMBER";
    }

    if (dateTimeTypes.includes(type)) {
      return "DATETIME";
    }

    if (stringTypes.includes(type)) {
      return "STRING";
    }

    return "UNKNOWN";
  }
}
