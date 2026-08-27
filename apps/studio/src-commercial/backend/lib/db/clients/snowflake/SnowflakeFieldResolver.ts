import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { SnowflakeResult } from "../snowflake";

// The driver reports its own type names ("fixed", "text"), which do not always
// match the ones `DESCRIBE TABLE` spells out.
const numberTypes = [
  "fixed",
  "real",
  "number",
  "decimal",
  "numeric",
  "int",
  "integer",
  "bigint",
  "smallint",
  "tinyint",
  "byteint",
  "float",
  "float4",
  "float8",
  "double",
  "double precision",
];

const dateTimeTypes = [
  "date",
  "time",
  "datetime",
  "timestamp",
  "timestamp_ltz",
  "timestamp_ntz",
  "timestamp_tz",
];

const stringTypes = [
  "text",
  "string",
  "varchar",
  "char",
  "character",
  "variant",
];

export class SnowflakeFieldResolver extends FieldResolver<SnowflakeResult> {
  protected resolveRuntimeColumnType(column: {
    name: string;
    type?: string | number | any;
  }): BksFieldType {
    return this.identifyType(column.type);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn): BksFieldType {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase() ?? "";
    // Strips the arguments of VARCHAR(16777216) and NUMBER(38,0).
    const type = declaration.split("(")[0].trim();

    if (type === "boolean") {
      return "BOOLEAN";
    }

    if (type === "binary" || type === "varbinary") {
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
