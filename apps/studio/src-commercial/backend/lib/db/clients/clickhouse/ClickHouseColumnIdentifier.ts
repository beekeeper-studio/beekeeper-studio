import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
import { BksFieldType } from "@/lib/db/models";
import { Result } from "../clickhouse";

const RE_TYPE_WRAPPER = /^(?:Nullable|LowCardinality)\((.*)\)$/;

const numberTypes = [
  "int8",
  "int16",
  "int32",
  "int64",
  "int128",
  "int256",
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "uint128",
  "uint256",
  "float32",
  "float64",
  "decimal",
  "decimal32",
  "decimal64",
  "decimal128",
  "decimal256",
];

const dateTimeTypes = ["date", "date32", "datetime", "datetime64"];

const stringTypes = [
  "string",
  "fixedstring",
  "uuid",
  "json",
  "enum8",
  "enum16",
];

/** Nullable(String) and LowCardinality(String) wrap the type we actually care about. */
function unwrapType(type?: string): string {
  let unwrapped = type;
  let match = RE_TYPE_WRAPPER.exec(unwrapped);
  while (match) {
    unwrapped = match[1];
    match = RE_TYPE_WRAPPER.exec(unwrapped);
  }
  return unwrapped;
}

export class ClickHouseColumnIdentifier extends ColumnIdentifier<Result> {
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
    const declaration = unwrapType(rawType)?.toLowerCase() ?? "";
    const type = declaration.split("(")[0].trim();

    if (type === "bool" || type === "boolean") {
      return "BOOLEAN";
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
