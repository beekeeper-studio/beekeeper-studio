import sql from "mssql";
import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
import { BksField, BksFieldType } from "@/lib/db/models";
import { SQLServerResult } from "@/lib/db/clients/sqlserver";

const binaryTypes = [sql.VarBinary, sql.Binary, sql.Image];

const numberDataTypes = [
  "tinyint",
  "smallint",
  "int",
  "bigint",
  "decimal",
  "numeric",
  "money",
  "smallmoney",
  "float",
  "real",
];

const dateTimeDataTypes = [
  "date",
  "datetime",
  "datetime2",
  "smalldatetime",
  "datetimeoffset",
  "time",
];

const stringDataTypes = [
  "char",
  "varchar",
  "text",
  "nchar",
  "nvarchar",
  "ntext",
  "xml",
  "uniqueidentifier",
];

const binaryDataTypes = [
  "binary",
  "varbinary",
  "image",
  "timestamp",
  "rowversion",
];

export class SqlServerColumnIdentifier extends ColumnIdentifier<SQLServerResult> {
  // The driver hands us column metadata keyed by name, not as an array.
  identifyResultColumns(qr: SQLServerResult): BksField[] {
    return Object.keys(qr.columns).map((key) => {
      const column = qr.columns[key];
      return {
        name: column.name,
        bksType: this.identifyResultColumnType(column),
      };
    });
  }

  protected identifyResultColumnType(column: {
    name: string;
    type?: any;
  }): BksFieldType {
    if (binaryTypes.includes(column.type)) {
      return "BINARY";
    }
    return this.identifyType(column.type?.declaration);
  }

  protected identifyListedColumnType(column: RawTableColumn): BksFieldType {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase() ?? "";
    // Strips the arguments of varchar(255) and decimal(18,3).
    const type = declaration.split("(")[0].trim();

    // bit is how sql server spells boolean, and the driver hands us real
    // booleans for it
    if (type === "bit") {
      return "BOOLEAN";
    }

    if (binaryDataTypes.includes(type)) {
      return "BINARY";
    }

    if (numberDataTypes.includes(type)) {
      return "NUMBER";
    }

    if (dateTimeDataTypes.includes(type)) {
      return "DATETIME";
    }

    if (stringDataTypes.includes(type)) {
      return "STRING";
    }

    return "UNKNOWN";
  }
}
