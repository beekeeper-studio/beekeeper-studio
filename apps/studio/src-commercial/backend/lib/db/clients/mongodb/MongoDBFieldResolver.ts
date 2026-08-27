/**
 * Reference for data types:
 * https://www.mongodb.com/docs/manual/reference/bson-types/
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { Binary, ObjectId } from "mongodb";
import { QueryResult } from "../mongodb";

// BSON type aliases as reported by the $type aggregation operator.

const regex = {
  binary: /^bindata$/,
  string: /^(?:string|symbol|javascript|regex)$/,
  number: /^(?:double|int|long|decimal)$/,
  datetime: /^(?:date|timestamp)$/,
  boolean: /^bool$/,
  objectId: /^objectid$/,
};

export class MongoDBFieldResolver extends FieldResolver<QueryResult> {
  resolveQueryResult(queryResult: QueryResult) {
    const row = queryResult.rows[0];
    if (!row) {
      return [];
    }
    return Object.keys(row).map((column) => {
      const value = row[column];
      let bksType: BksFieldType = "UNKNOWN";

      if (value instanceof ObjectId) {
        bksType = "OBJECTID";
      } else if (typeof value === "number" || typeof value === "bigint") {
        bksType = "NUMBER";
      } else if (typeof value === "boolean") {
        bksType = "BOOLEAN";
      } else if (value instanceof Date) {
        bksType = "DATETIME";
      } else if (
        value instanceof Binary ||
        value instanceof ArrayBuffer ||
        ArrayBuffer.isView(value)
      ) {
        bksType = "BINARY";
      } else if (typeof value === "string") {
        bksType = "STRING";
      }

      return { name: column, bksType };
    });
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    const type = column.dataType?.toLowerCase() ?? "";

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

    if (regex.objectId.test(type)) {
      return "OBJECTID";
    }

    return "UNKNOWN";
  }
}
