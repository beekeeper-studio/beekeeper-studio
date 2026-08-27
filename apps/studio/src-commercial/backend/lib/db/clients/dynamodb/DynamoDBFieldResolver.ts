/**
 * Reference for data types:
 * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { DynamoQueryResult, ResultColumn } from "../dynamodb";

export class DynamoDBFieldResolver extends FieldResolver<DynamoQueryResult> {
  protected resolveRuntimeColumnType(
    column: ResultColumn,
    queryResult: DynamoQueryResult
  ) {
    const row = queryResult.rows[0];
    const value = row?.[column.name];

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

  protected resolveDeclaredColumnType(column: RawTableColumn) {
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
}
