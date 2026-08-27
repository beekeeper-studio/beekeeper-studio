/**
 * Reference for data types:
 * https://clickhouse.com/docs/reference/data-types
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { Result } from "../clickhouse";

const NUMBER = /^(?:u?int(?:8|16|32|64|128|256)|float(?:32|64)|bfloat16|decimal(?:32|64|128|256)?)$/;

const DATETIME = /^(?:date(?:32)?|datetime(?:64)?|time(?:64)?)$/;

const STRING = /^(?:string|fixedstring|uuid|json|enum(?:8|16)?|ipv4|ipv6)$/;

const BOOLEAN = /^bool(?:ean)?$/;

const RE_TYPE_WRAPPER = /^(?:Nullable|LowCardinality)\((.*)\)$/;

/** Nullable(String) and LowCardinality(String) wrap the type we actually care about. */
function unwrapType(type?: string): string {
  const match = type && RE_TYPE_WRAPPER.exec(type);
  return match ? unwrapType(match[1]) : (type as string);
}

export class ClickHouseFieldResolver extends FieldResolver<Result> {
  protected resolveRuntimeColumnType(column: {
    name: string;
    type?: string;
  }): BksFieldType {
    return this.identifyType(column.type);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn): BksFieldType {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = unwrapType(rawType)?.toLowerCase() ?? "";
    const type = declaration.split("(")[0].trim();

    if (BOOLEAN.test(type)) {
      return "BOOLEAN";
    }

    if (NUMBER.test(type)) {
      return "NUMBER";
    }

    if (DATETIME.test(type)) {
      return "DATETIME";
    }

    if (STRING.test(type)) {
      return "STRING";
    }

    return "UNKNOWN";
  }
}
