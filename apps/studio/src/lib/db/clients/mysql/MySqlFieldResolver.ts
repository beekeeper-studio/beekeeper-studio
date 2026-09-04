/**
 * Reference for data types:
 * https://dev.mysql.com/doc/refman/8.4/en/data-types.html
 */

import mysql from "mysql2";
import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { ResultColumn, ResultType } from "@/lib/db/clients/mysql";

const binaryTypes = [
  mysql.Types.STRING, // aka CHAR or BINARY
  mysql.Types.VAR_STRING, // aka VARCHAR or VARBINARY
  mysql.Types.TINY_BLOB,
  mysql.Types.BLOB,
  mysql.Types.MEDIUM_BLOB,
  mysql.Types.LONG_BLOB,
];

const numberTypes = [
  mysql.Types.TINY,
  mysql.Types.SHORT,
  mysql.Types.LONG,
  mysql.Types.INT24,
  mysql.Types.LONGLONG,
  mysql.Types.FLOAT,
  mysql.Types.DOUBLE,
  mysql.Types.DECIMAL,
  mysql.Types.NEWDECIMAL,
  mysql.Types.BIT,
];

const dateTimeTypes = [
  mysql.Types.DATE,
  mysql.Types.NEWDATE,
  mysql.Types.DATETIME,
  mysql.Types.TIMESTAMP,
  mysql.Types.TIME,
  mysql.Types.YEAR,
];

const stringTypes = [
  mysql.Types.STRING,
  mysql.Types.VAR_STRING,
  mysql.Types.VARCHAR,
  mysql.Types.TINY_BLOB,
  mysql.Types.BLOB,
  mysql.Types.MEDIUM_BLOB,
  mysql.Types.LONG_BLOB,
  mysql.Types.ENUM,
  mysql.Types.SET,
  mysql.Types.JSON,
];

const regex = {
  binary: /^(?:binary|varbinary|(?:tiny|medium|long)?blob)\b/,
  string: /^(?:char|varchar|(?:tiny|medium|long)?text|enum|set|json)\b/,
  // The (1) is the only thing telling a boolean apart from a tinyint.
  number:
    /^(?!tinyint\s*\(\s*1\s*\))(?:tinyint|smallint|mediumint|int(?:eger)?|bigint|decimal|numeric|float|double|real|bit)\b/,
  datetime: /^(?:date|datetime|timestamp|time|year)\b/,
  boolean: /^tinyint\s*\(\s*1\s*\)/,
};

// The BINARY flag is also set on binary-collated text (e.g. utf8mb4_bin), so
// only the charset tells a real binary column apart. Ref: issue #2640.
const BINARY_CHARSET = 63;

export class MysqlFieldResolver extends FieldResolver<ResultType> {
  protected resolveRuntimeColumnType(field: ResultColumn) {
    if (
      binaryTypes.includes(field.type) &&
      field.characterSet === BINARY_CHARSET
    ) {
      return "BINARY";
    }

    // The (1) is the only thing telling a boolean apart from a tinyint.
    if (field.type === mysql.Types.TINY && field.columnLength === 1) {
      return "BOOLEAN";
    }

    if (numberTypes.includes(field.type)) {
      return "NUMBER";
    }

    if (dateTimeTypes.includes(field.type)) {
      return "DATETIME";
    }

    if (stringTypes.includes(field.type)) {
      return "STRING";
    }

    return "UNKNOWN";
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    const declaration = column.dataType?.toLowerCase().trim() ?? "";

    if (regex.binary.test(declaration)) {
      return "BINARY";
    }

    if (regex.string.test(declaration)) {
      return "STRING";
    }

    if (regex.number.test(declaration)) {
      return "NUMBER";
    }

    if (regex.datetime.test(declaration)) {
      return "DATETIME";
    }

    if (regex.boolean.test(declaration)) {
      return "BOOLEAN";
    }

    return "UNKNOWN";
  }
}
