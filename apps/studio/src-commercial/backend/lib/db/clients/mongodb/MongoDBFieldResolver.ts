/**
 * Reference for data types:
 * https://www.mongodb.com/docs/manual/reference/bson-types/
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
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
    return Object.keys(row).map((name) => {
      const column = { name };
      const bksType = this.resolveRuntimeColumnType(column, queryResult);
      return { name, bksType } as const;
    });
  }

  protected resolveRuntimeColumnType(
    column: QueryResult["columns"][number],
    queryResult: QueryResult
  ) {
    const row = queryResult.rows[0];
    const value = row?.[column.name];

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

    if (typeof value === "number" || typeof value === "bigint") {
      return "NUMBER";
    }

    if (value instanceof Date) {
      return "DATETIME";
    }

    if (typeof value === "boolean") {
      return "BOOLEAN";
    }

    if (value instanceof ObjectId) {
      return "OBJECTID";
    }

    return "UNKNOWN";
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
