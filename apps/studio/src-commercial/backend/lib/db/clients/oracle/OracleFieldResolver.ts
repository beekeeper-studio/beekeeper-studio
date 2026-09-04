/**
 * Reference for data types:
 * https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlrf/Data-Types.html
 */

import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksFieldType } from "@/lib/db/models";
import { DriverResult, ResultColumn } from "../oracle";

// Matched against whole declarations like `TIMESTAMP(6) WITH LOCAL TIME ZONE`
// and `LONG RAW`, so binary has to win over the `long` in string.
const regex = {
  binary: /^(?:blob|bfile|(?:long )?raw)\b/,
  string: /^(?:n?varchar2?|n?char|n?clob|long|u?rowid|json|xmltype)\b/,
  number:
    /^(?:number|float|binary_float|binary_double|int(?:eger)?|smallint|dec(?:imal)?|numeric|real|double precision)\b/,
  datetime: /^(?:date|timestamp|interval)\b/,
  boolean: /^boolean\b/,
};

export class OracleFieldResolver extends FieldResolver<DriverResult> {
  protected resolveRuntimeColumnType(column: ResultColumn) {
    return this.identifyType(column.dbTypeName);
  }

  protected resolveDeclaredColumnType(column: RawTableColumn) {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase().trim() ?? "";

    if (regex.binary.test(declaration)) {
      return "BINARY";
    }

    if (regex.string.test(declaration)) {
      return "STRING";
    }

    if (regex.number.test(declaration)) {
      return "NUMBER";
    }

    if (regex.datetime.test(declaration)) {
      return "DATETIME";
    }

    if (regex.boolean.test(declaration)) {
      return "BOOLEAN";
    }

    return "UNKNOWN";
  }
}
