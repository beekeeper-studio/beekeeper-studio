import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
import { BksFieldType } from "@/lib/db/models";
import { DuckDBType, DuckDBTypeId } from "@duckdb/node-api";
import { DuckDBResult } from "../duckdb";

const numberTypes = [
  "tinyint",
  "smallint",
  "integer",
  "bigint",
  "hugeint",
  "utinyint",
  "usmallint",
  "uinteger",
  "ubigint",
  "uhugeint",
  "float",
  "double",
  "decimal",
  "bignum",
  "bit",
];

const dateTimeTypes = [
  "date",
  "time",
  "timestamp",
  "timestamp_s",
  "timestamp_ms",
  "timestamp_ns",
  "timestamp_tz",
  "time_tz",
  "interval",
];

const stringTypes = ["varchar", "enum", "uuid"];

export class DuckDBColumnIdentifier extends ColumnIdentifier<DuckDBResult> {
  protected identifyResultColumnType(column: {
    name: string;
    type: DuckDBType;
  }): BksFieldType {
    if (column.type.typeId === DuckDBTypeId.BLOB) {
      return "BINARY";
    }
    return this.identifyType(DuckDBTypeId[column.type.typeId]);
  }

  protected identifyListedColumnType(column: RawTableColumn): BksFieldType {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase() ?? "";
    // Strips the arguments of DECIMAL(18,3), ENUM('a','b'), VARCHAR[], and the
    // trailing modifiers of TIMESTAMP WITH TIME ZONE.
    const type = declaration.split(/[([ ]/)[0].trim();

    if (type === "boolean") {
      return "BOOLEAN";
    }

    if (type === "blob") {
      return "BINARY";
    }

    if (numberTypes.includes(type)) {
      return "NUMBER";
    }

    if (dateTimeTypes.includes(type)) {
      return "DATETIME";
    }

    if (stringTypes.includes(type)) {
      return "STRING";
    }

    return "UNKNOWN";
  }
}
