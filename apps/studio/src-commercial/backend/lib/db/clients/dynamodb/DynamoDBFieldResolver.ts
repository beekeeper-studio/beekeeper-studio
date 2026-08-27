import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksField, BksFieldType } from "@/lib/db/models";
import { DynamoQueryResult } from "../dynamodb";

export class DynamoDBFieldResolver extends FieldResolver<DynamoQueryResult> {
  // Scans report no attribute types, so the values decide.
  resolveQueryResult(queryResult: DynamoQueryResult): BksField[] {
    const row = queryResult.rows[0];
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
  protected resolveDeclaredColumnType(column: RawTableColumn): BksFieldType {
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
