/**
 * Reference for data types:
 * https://duckdb.org/docs/stable/sql/data_types/overview
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { loadDuckDB } from "@shared/lib/knex-duckdb/loadDuckDB";
import { DuckDBResult, ResultColumn } from "../duckdb";

const regex = {
  binary: /^blob$/,
  string: /^(?:varchar|enum|uuid|json)$/,
  number:
    /^(?:u?(?:tinyint|smallint|integer|bigint|hugeint)|float|double|decimal|bignum|bit)$/,
  datetime: /^(?:date|time(?:_tz)?|timestamp(?:_(?:s|ms|ns|tz))?|interval)$/,
  boolean: /^boolean$/,
};

export class DuckDBFieldResolver extends FieldResolver<DuckDBResult> {
  private bksTypesByTypeId?: Record<number, BksFieldType>;

  protected resolveRuntimeColumnType(column: ResultColumn) {
    if (!this.bksTypesByTypeId) {
      this.bksTypesByTypeId = this.buildBksTypesByTypeId();
    }
    return this.bksTypesByTypeId[column.type.typeId] ?? "UNKNOWN";
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    const declaration = column.dataType?.toLowerCase() ?? "";
    // Strips the arguments of DECIMAL(18,3), ENUM('a','b'), VARCHAR[], and the
    // trailing modifiers of TIMESTAMP WITH TIME ZONE.
    const type = declaration.split(/[([ ]/)[0].trim();

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

  private buildBksTypesByTypeId(): Record<number, BksFieldType> {
    const { DuckDBTypeId } = loadDuckDB();
    return {
      // binary
      [DuckDBTypeId.BLOB]: "BINARY",

      // string
      [DuckDBTypeId.VARCHAR]: "STRING",
      [DuckDBTypeId.ENUM]: "STRING",
      [DuckDBTypeId.UUID]: "STRING",

      // number
      [DuckDBTypeId.TINYINT]: "NUMBER",
      [DuckDBTypeId.SMALLINT]: "NUMBER",
      [DuckDBTypeId.INTEGER]: "NUMBER",
      [DuckDBTypeId.BIGINT]: "NUMBER",
      [DuckDBTypeId.HUGEINT]: "NUMBER",
      [DuckDBTypeId.UTINYINT]: "NUMBER",
      [DuckDBTypeId.USMALLINT]: "NUMBER",
      [DuckDBTypeId.UINTEGER]: "NUMBER",
      [DuckDBTypeId.UBIGINT]: "NUMBER",
      [DuckDBTypeId.UHUGEINT]: "NUMBER",
      [DuckDBTypeId.FLOAT]: "NUMBER",
      [DuckDBTypeId.DOUBLE]: "NUMBER",
      [DuckDBTypeId.DECIMAL]: "NUMBER",
      [DuckDBTypeId.BIGNUM]: "NUMBER",
      [DuckDBTypeId.BIT]: "NUMBER",

      // datetime
      [DuckDBTypeId.DATE]: "DATETIME",
      [DuckDBTypeId.TIME]: "DATETIME",
      [DuckDBTypeId.TIME_TZ]: "DATETIME",
      [DuckDBTypeId.TIMESTAMP]: "DATETIME",
      [DuckDBTypeId.TIMESTAMP_S]: "DATETIME",
      [DuckDBTypeId.TIMESTAMP_MS]: "DATETIME",
      [DuckDBTypeId.TIMESTAMP_NS]: "DATETIME",
      [DuckDBTypeId.TIMESTAMP_TZ]: "DATETIME",
      [DuckDBTypeId.INTERVAL]: "DATETIME",

      // boolean
      [DuckDBTypeId.BOOLEAN]: "BOOLEAN",

      // unknown
      [DuckDBTypeId.INVALID]: "UNKNOWN",
      [DuckDBTypeId.LIST]: "UNKNOWN",
      [DuckDBTypeId.STRUCT]: "UNKNOWN",
      [DuckDBTypeId.MAP]: "UNKNOWN",
      [DuckDBTypeId.ARRAY]: "UNKNOWN",
      [DuckDBTypeId.UNION]: "UNKNOWN",
      [DuckDBTypeId.ANY]: "UNKNOWN",
      [DuckDBTypeId.SQLNULL]: "UNKNOWN",
    };
  }
}
