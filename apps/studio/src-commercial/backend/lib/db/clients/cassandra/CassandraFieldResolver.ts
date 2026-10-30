/**
 * Reference for data types:
 * https://cassandra.apache.org/doc/latest/cassandra/developing/cql/types.html
 */

import * as cassandra from "cassandra-driver";
import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { CassandraResult, ResultColumn } from "../cassandra";

const dataTypes = cassandra.types.dataTypes;

const regex = {
  binary: /^blob$/,
  string: /^(?:ascii|text|varchar|uuid|timeuuid|inet)$/,
  number: /^(?:tinyint|smallint|int|bigint|varint|float|double|decimal|counter)$/,
  datetime: /^(?:date|time|timestamp|duration)$/,
  boolean: /^boolean$/,
};

const typeCodes: Record<number, BksFieldType> = {
  // binary
  [dataTypes.blob]: "BINARY",

  // string
  [dataTypes.ascii]: "STRING",
  [dataTypes.text]: "STRING",
  [dataTypes.varchar]: "STRING",
  [dataTypes.uuid]: "STRING",
  [dataTypes.timeuuid]: "STRING",
  [dataTypes.inet]: "STRING",

  // number
  [dataTypes.tinyint]: "NUMBER",
  [dataTypes.smallint]: "NUMBER",
  [dataTypes.int]: "NUMBER",
  [dataTypes.bigint]: "NUMBER",
  [dataTypes.varint]: "NUMBER",
  [dataTypes.float]: "NUMBER",
  [dataTypes.double]: "NUMBER",
  [dataTypes.decimal]: "NUMBER",
  [dataTypes.counter]: "NUMBER",

  // datetime
  [dataTypes.date]: "DATETIME",
  [dataTypes.time]: "DATETIME",
  [dataTypes.timestamp]: "DATETIME",
  [dataTypes.duration]: "DATETIME",

  // boolean
  [dataTypes.boolean]: "BOOLEAN",
};

export class CassandraFieldResolver extends FieldResolver<CassandraResult> {
  protected resolveRuntimeColumnType(column: ResultColumn) {
    // Cassandra sends duration as a custom type over protocol v4.
    if (column.type.info === "org.apache.cassandra.db.marshal.DurationType") {
      return "DATETIME";
    }
    return typeCodes[column.type.code] ?? "UNKNOWN";
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    const type = column.dataType?.toLowerCase().trim() ?? "";

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

    return "UNKNOWN";
  }
}
