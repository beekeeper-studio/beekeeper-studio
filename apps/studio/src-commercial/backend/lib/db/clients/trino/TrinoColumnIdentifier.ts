import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
import { BksFieldType } from "@/lib/db/models";
import { TrinoResult } from "../trino";

const numberTypes = [
  "tinyint",
  "smallint",
  "integer",
  "int",
  "bigint",
  "real",
  "double",
  "decimal",
];

const dateTimeTypes = ["date", "time", "timestamp", "interval"];

const stringTypes = ["char", "varchar", "json", "uuid", "ipaddress"];

export class TrinoColumnIdentifier extends ColumnIdentifier<TrinoResult> {
  protected identifyResultColumnType(column: {
    name: string;
    type?: string;
  }): BksFieldType {
    return this.identifyType(column.type);
  }

  protected identifyListedColumnType(column: RawTableColumn): BksFieldType {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase() ?? "";
    // Strips the arguments of varchar(20) and the trailing modifiers of
    // timestamp with time zone.
    const type = declaration.split(/[( ]/)[0].trim();

    if (type === "boolean") {
      return "BOOLEAN";
    }

    if (type === "varbinary") {
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
