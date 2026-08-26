import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
import { BksField, BksFieldType } from "@/lib/db/models";
import { Binary, ObjectId } from "mongodb";
import { QueryResult } from "../mongodb";

// BSON type aliases as reported by the $type aggregation operator.
// See https://www.mongodb.com/docs/manual/reference/operator/aggregation/type/
const numberTypes = ["double", "int", "long", "decimal"];

const dateTimeTypes = ["date", "timestamp"];

export class MongoDBColumnIdentifier extends ColumnIdentifier<QueryResult> {
  identifyResultColumns(qr: QueryResult): BksField[] {
    const row = qr.rows[0];
    if (!row) {
      return [];
    }
    return Object.keys(row).map((column) => ({
      name: column,
      bksType: this.identifyValue(row[column]),
    }));
  }

  protected identifyListedColumnType(column: RawTableColumn): BksFieldType {
    const type = column.dataType?.toLowerCase() ?? "";

    if (type === "objectid") {
      return "OBJECTID";
    }

    if (type === "bool") {
      return "BOOLEAN";
    }

    if (type === "bindata") {
      return "BINARY";
    }

    if (type === "string") {
      return "STRING";
    }

    if (numberTypes.includes(type)) {
      return "NUMBER";
    }

    if (dateTimeTypes.includes(type)) {
      return "DATETIME";
    }

    return "UNKNOWN";
  }

  private identifyValue(value: unknown): BksFieldType {
    if (value instanceof ObjectId) {
      return "OBJECTID";
    }
    if (typeof value === "number" || typeof value === "bigint") {
      return "NUMBER";
    }
    if (typeof value === "boolean") {
      return "BOOLEAN";
    }
    if (value instanceof Date) {
      return "DATETIME";
    }
    if (
      value instanceof Binary ||
      value instanceof ArrayBuffer ||
      ArrayBuffer.isView(value)
    ) {
      return "BINARY";
    }
    if (typeof value === "string") {
      return "STRING";
    }
    return "UNKNOWN";
  }
}
