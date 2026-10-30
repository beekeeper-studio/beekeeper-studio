/**
 * Reference for data types:
 * https://trino.io/docs/current/language/types.html
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { ResultColumn, TrinoResult } from "../trino";

const regex = {
  binary: /^varbinary$/,
  string: /^(?:char|varchar|json|uuid|ipaddress|variant)$/,
  number: /^(?:tinyint|smallint|int(?:eger)?|bigint|real|double|decimal)$/,
  datetime: /^(?:date|time|timestamp|interval)$/,
  boolean: /^boolean$/,
};

export class TrinoFieldResolver extends FieldResolver<TrinoResult> {
  protected resolveRuntimeColumnType(column: ResultColumn) {
    return this.identifyType(column.type);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase() ?? "";
    // Strips the arguments of varchar(20) and the trailing modifiers of
    // timestamp with time zone.
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
