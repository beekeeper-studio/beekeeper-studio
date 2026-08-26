import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
import { BksField, BksFieldType } from "@/lib/db/models";
import { DynamoQueryResult } from "../dynamodb";

export class DynamoDBColumnIdentifier extends ColumnIdentifier<DynamoQueryResult> {
  // Scans report no attribute types, so the values decide.
  identifyResultColumns(qr: DynamoQueryResult): BksField[] {
    const row = qr.rows[0];
    if (!row) {
      return [];
    }
    return Object.keys(row).map((column) => ({
      name: column,
      bksType: this.identifyValue(row[column]),
    }));
  }

  // Listed columns carry the readable label from `dynamoTypeLabel`, not the
  // short code the SDK uses.
  protected identifyListedColumnType(column: RawTableColumn): BksFieldType {
    switch (column.dataType?.toLowerCase()) {
      case "string":
        return "STRING";
      case "number":
        return "NUMBER";
      case "binary":
        return "BINARY";
      case "boolean":
        return "BOOLEAN";
      default:
        return "UNKNOWN";
    }
  }

  private identifyValue(value: unknown): BksFieldType {
    if (typeof value === "string") {
      return "STRING";
    }
    if (typeof value === "number" || typeof value === "bigint") {
      return "NUMBER";
    }
    if (typeof value === "boolean") {
      return "BOOLEAN";
    }
    if (value instanceof Uint8Array) {
      return "BINARY";
    }
    return "UNKNOWN";
  }
}
