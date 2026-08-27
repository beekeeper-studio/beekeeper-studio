/**
 * Reference for data types:
 * https://www.postgresql.org/docs/current/datatype.html
 */

import pg from "pg";
import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { QueryResult, ResultColumn } from "@/lib/db/clients/postgresql";

const regex = {
  binary: /^bytea$/,
  string:
    /^(?:char|bpchar|varchar|text|citext|name|uuid|json|jsonb|xml|bit|varbit|inet|cidr|macaddr8?|tsvector|tsquery|pg_lsn)$/,
  number:
    /^(?:int2|int4|int8|smallint|integer|bigint|float4|float8|real|numeric|decimal|money|oid)$/,
  datetime: /^(?:date|time|timetz|timestamp|timestamptz|interval)$/,
  boolean: /^bool(?:ean)?$/,
};

export class PostgresFieldResolver extends FieldResolver<QueryResult> {
  private oidTypes: Record<number, string> = {};

  setOidTypes(oidTypes: Record<number, string>) {
    this.oidTypes = oidTypes;
  }

  protected resolveRuntimeColumnType(column: ResultColumn) {
    if (column.dataTypeID === pg.types.builtins.BYTEA) {
      return "BINARY";
    }
    return this.identifyType(this.oidTypes[column.dataTypeID]);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase() ?? "";
    // Strips the arguments of varchar(255) and numeric(10,2).
    const type = declaration.split("(")[0].trim();

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
