/**
 * Reference for data types:
 * https://firebirdsql.org/file/documentation/html/en/refdocs/fblangref50/firebird-50-language-reference.html#fblangref50-datatypes
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { FirebirdResult, ResultColumn } from "../firebird";
import {
  SQL_ARRAY,
  SQL_BLOB,
  SQL_BOOLEAN,
  SQL_D_FLOAT,
  SQL_DOUBLE,
  SQL_FLOAT,
  SQL_INT64,
  SQL_INT128,
  SQL_LONG,
  SQL_NULL,
  SQL_QUAD,
  SQL_SHORT,
  SQL_TEXT,
  SQL_TIMESTAMP,
  SQL_TYPE_DATE,
  SQL_TYPE_TIME,
  SQL_VARYING,
} from "node-firebird/lib/wire/const";

const regex = {
  binary: /^(?:blob|binary|varbinary)$/,
  string: /^(?:char|character|varchar|cstring)$/,
  number:
    /^(?:smallint|int(?:eger|128)?|bigint|dec(?:imal|float)?|numeric|float|real|double|d_float|quad)$/,
  datetime: /^(?:date|time|timestamp)$/,
  boolean: /^boolean$/,
};

const typeIds: Record<number, BksFieldType> = {
  // binary
  [SQL_BLOB]: "BINARY",

  // string
  [SQL_TEXT]: "STRING",
  [SQL_VARYING]: "STRING",

  // number
  [SQL_SHORT]: "NUMBER",
  [SQL_LONG]: "NUMBER",
  [SQL_FLOAT]: "NUMBER",
  [SQL_DOUBLE]: "NUMBER",
  [SQL_D_FLOAT]: "NUMBER",
  [SQL_INT64]: "NUMBER",
  [SQL_INT128]: "NUMBER",
  [SQL_QUAD]: "NUMBER",

  // datetime
  [SQL_TIMESTAMP]: "DATETIME",
  [SQL_TYPE_TIME]: "DATETIME",
  [SQL_TYPE_DATE]: "DATETIME",

  // boolean
  [SQL_BOOLEAN]: "BOOLEAN",

  // unknown
  [SQL_ARRAY]: "UNKNOWN",
  [SQL_NULL]: "UNKNOWN",
};

export class FirebirdFieldResolver extends FieldResolver<FirebirdResult> {
  protected resolveRuntimeColumnType(column: ResultColumn) {
    return typeIds[column.type] ?? "UNKNOWN";
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    const declaration = column.dataType?.toLowerCase() ?? "";
    // Strips the arguments of VARCHAR(20) and the trailing modifiers of
    // TIMESTAMP WITH TIME ZONE.
    const type = declaration.split(/[( ]/)[0].trim();

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
