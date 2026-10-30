/**
 * Reference for data types:
 * https://clickhouse.com/docs/reference/data-types
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { Result, ResultColumn } from "../clickhouse";

const regex = {
  string: /^(?:string|fixedstring|uuid|json|enum(?:8|16)?|ipv4|ipv6)$/,
  number:
    /^(?:u?int(?:8|16|32|64|128|256)|float(?:32|64)|bfloat16|decimal(?:32|64|128|256)?)$/,
  datetime: /^(?:date(?:32)?|datetime(?:64)?|time(?:64)?)$/,
  boolean: /^bool(?:ean)?$/,
  typeWrapper: /^(?:Nullable|LowCardinality)\((.*)\)$/,
};

/** Nullable(String) and LowCardinality(String) wrap the type we actually care about. */
function unwrapType(type?: string): string {
  const match = type && regex.typeWrapper.exec(type);
  return match ? unwrapType(match[1]) : (type as string);
}

export class ClickHouseFieldResolver extends FieldResolver<Result> {
  protected resolveRuntimeColumnType(column: ResultColumn) {
    return this.identifyType(column.type);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = unwrapType(rawType)?.toLowerCase() ?? "";
    const type = declaration.split("(")[0].trim();

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
