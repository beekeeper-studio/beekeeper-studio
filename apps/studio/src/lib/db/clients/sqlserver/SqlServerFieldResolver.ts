/**
 * Reference for data types:
 * https://learn.microsoft.com/en-us/sql/t-sql/data-types/data-types-transact-sql
 */

import sql from "mssql";
import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { ResultColumn, SQLServerResult } from "@/lib/db/clients/sqlserver";

const binaryTypes = [sql.VarBinary, sql.Binary, sql.Image];

const regex = {
  // timestamp is the synonym for the rowversion data type, not a date.
  binary: /^(?:binary|varbinary|image|timestamp|rowversion)$/,
  string: /^(?:n?char|n?varchar|n?text|xml|uniqueidentifier|sysname)$/,
  number:
    /^(?:tinyint|smallint|int|bigint|decimal|numeric|(?:small)?money|float|real)$/,
  datetime: /^(?:date|datetime2?|smalldatetime|datetimeoffset|time)$/,
  // bit is how sql server spells boolean
  boolean: /^bit$/,
};

export class SqlServerFieldResolver extends FieldResolver<SQLServerResult> {
  // The driver hands us column metadata keyed by name, not as an array.
  resolveQueryResult(queryResult: SQLServerResult) {
    return Object.keys(queryResult.columns).map((key) => {
      const column = queryResult.columns[key];
      return {
        name: column.name,
        bksType: this.resolveRuntimeColumnType(column),
      };
    });
  }

  protected resolveRuntimeColumnType(column: ResultColumn) {
    if (binaryTypes.includes(column.type as (typeof binaryTypes)[number])) {
      return "BINARY";
    }
    // The type factory carries `declaration` at runtime, but @types/mssql leaves it off.
    return this.identifyType(column.type["declaration"]);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase() ?? "";
    // Strips the arguments of varchar(255) and decimal(18,3).
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
