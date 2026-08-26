import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
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

export class FirebirdColumnIdentifier extends ColumnIdentifier<FirebirdResult> {
  identifyResultColumns(qr: FirebirdResult): BksField[] {
    return qr.columns.map((column) => ({
      name: column.field,
      bksType: this.identifyResultColumnType(column),
    }));
  }

  protected identifyResultColumnType(column: {
    name: string;
    type?: number;
  }): BksFieldType {
    return SQL_TYPES[column.type] ?? "UNKNOWN";
  }

  protected identifyListedColumnType(column: RawTableColumn): BksFieldType {
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
