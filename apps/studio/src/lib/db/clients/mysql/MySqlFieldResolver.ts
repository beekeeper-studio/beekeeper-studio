import mysql from "mysql2";
import { FieldResolver, RawTableColumn } from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { ResultType } from "@/lib/db/clients/mysql";

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

const binaryDataTypes = [
  "binary",
  "varbinary",
  "tinyblob",
  "blob",
  "mediumblob",
  "longblob",
];

const numberDataTypes = [
  "tinyint",
  "smallint",
  "mediumint",
  "int",
  "integer",
  "bigint",
  "decimal",
  "numeric",
  "float",
  "double",
  "real",
  "bit",
];

const dateTimeDataTypes = ["date", "datetime", "timestamp", "time", "year"];

const stringDataTypes = [
  "char",
  "varchar",
  "tinytext",
  "text",
  "mediumtext",
  "longtext",
  "enum",
  "set",
];

// Ref: https://github.com/sidorares/node-mysql2/blob/master/lib/constants/field_flags.js
const FieldFlags = {
  BINARY: 128,
};

export class MysqlFieldResolver extends FieldResolver<ResultType> {
  protected resolveRuntimeColumnType(field: mysql.FieldPacket): BksFieldType {
    if (
      binaryTypes.includes(field.type) &&
      (field.flags as number) & FieldFlags.BINARY
    ) {
      return "BINARY";
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

  protected resolveDeclaredColumnType(column: RawTableColumn): BksFieldType {
    const declaration = column.dataType?.toLowerCase() ?? "";
    const type = declaration.split("(")[0].trim();

    if (binaryDataTypes.includes(type)) {
      return "BINARY";
    }

    // NOTE: There is no boolean type, mysql spells it tinyint(1)
    if (/^tinyint\s*\(\s*1\s*\)/.test(declaration)) {
      return "BOOLEAN";
    }

    if (numberDataTypes.includes(type)) {
      return "NUMBER";
    }

    if (dateTimeDataTypes.includes(type)) {
      return "DATETIME";
    }

    if (stringDataTypes.includes(type)) {
      return "STRING";
    }

    return "UNKNOWN";
  }
}
