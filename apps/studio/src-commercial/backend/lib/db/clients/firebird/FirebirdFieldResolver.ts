import {
  FieldResolver,
  RawTableColumn,
} from "@/lib/db/serialization/FieldResolver";
import { BksField, BksFieldType } from "@/lib/db/models";
import { FirebirdResult } from "../firebird";

const SQL_TYPES: Record<number, BksFieldType> = {
  448: "STRING", // SQL_VARYING
  452: "STRING", // SQL_TEXT
  480: "NUMBER", // SQL_DOUBLE
  482: "NUMBER", // SQL_FLOAT
  496: "NUMBER", // SQL_LONG
  500: "NUMBER", // SQL_SHORT
  510: "DATETIME", // SQL_TIMESTAMP
  520: "BINARY", // SQL_BLOB
  530: "NUMBER", // SQL_D_FLOAT
  560: "DATETIME", // SQL_TYPE_TIME
  570: "DATETIME", // SQL_TYPE_DATE
  580: "NUMBER", // SQL_INT64
  32752: "NUMBER", // SQL_INT128
  32764: "BOOLEAN", // SQL_BOOLEAN
};

const numberTypes = [
  "smallint",
  "integer",
  "bigint",
  "int128",
  "decimal",
  "numeric",
  "float",
  "double",
  "d_float",
  "decfloat",
  "quad",
];

const dateTimeTypes = ["date", "time", "timestamp"];

const stringTypes = ["char", "varchar", "cstring"];

export class FirebirdFieldResolver extends FieldResolver<FirebirdResult> {
  resolveQueryResult(queryResult: FirebirdResult): BksField[] {
    return queryResult.columns.map((column) => ({
      name: column.field,
      bksType: this.resolveRuntimeColumnType(column),
    }));
  }

  protected resolveRuntimeColumnType(column: {
    name: string;
    type?: number;
  }): BksFieldType {
    return SQL_TYPES[column.type] ?? "UNKNOWN";
  }

  protected resolveDeclaredColumnType(column: RawTableColumn): BksFieldType {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase() ?? "";
    // Strips the arguments of VARCHAR(20) and the trailing modifiers of
    // TIMESTAMP WITH TIME ZONE.
    const type = declaration.split(/[( ]/)[0].trim();

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
