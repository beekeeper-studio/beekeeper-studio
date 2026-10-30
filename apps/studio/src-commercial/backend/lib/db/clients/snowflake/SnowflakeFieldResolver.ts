/**
 * Reference for data types:
 * https://docs.snowflake.com/en/sql-reference/intro-summary-data-types
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { ResultColumn, SnowflakeResult } from "../snowflake";

const regex = {
  binary: /^(?:binary|varbinary)$/,
  string: /^(?:text|string|varchar|char(?:acter)?|variant|object|array|uuid)$/,
  number:
    /^(?:fixed|number|decimal|numeric|decfloat|int(?:eger)?|bigint|smallint|tinyint|byteint|float[48]?|real|double(?: precision)?)$/,
  datetime: /^(?:date|time|datetime|timestamp(?:_(?:ltz|ntz|tz))?)$/,
  boolean: /^boolean$/,
};

export class SnowflakeFieldResolver extends FieldResolver<SnowflakeResult> {
  protected resolveRuntimeColumnType(column: ResultColumn) {
    return this.identifyType(column.type);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase() ?? "";
    // Strips the arguments of VARCHAR(16777216) and NUMBER(38,0).
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
