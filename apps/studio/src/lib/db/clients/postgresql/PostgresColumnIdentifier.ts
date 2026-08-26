import pg from "pg";
import {
  ColumnIdentifier,
  RawTableColumn,
} from "@/lib/db/serialization/ColumnIdentifier";
import { BksFieldType } from "@/lib/db/models";
import { QueryResult } from "@/lib/db/clients/postgresql";

const numberTypes = [
  "int2",
  "int4",
  "int8",
  "smallint",
  "integer",
  "bigint",
  "float4",
  "float8",
  "real",
  "numeric",
  "decimal",
  "money",
  "oid",
];

const dateTimeTypes = [
  "date",
  "time",
  "timetz",
  "timestamp",
  "timestamptz",
  "interval",
];

const stringTypes = [
  "char",
  "bpchar",
  "varchar",
  "text",
  "citext",
  "name",
  "uuid",
  "json",
  "jsonb",
  "xml",
];

export class PostgresColumnIdentifier extends ColumnIdentifier<QueryResult> {
  /** Postgres reports result column types as oids, which the client resolves. */
  constructor(private dataTypes: () => Record<number, string>) {
    super();
  }

  protected identifyResultColumnType(column: {
    name: string;
    dataTypeID?: number;
  }): BksFieldType {
    if (column.dataTypeID === pg.types.builtins.BYTEA) {
      return "BINARY";
    }
    return this.identifyType(this.dataTypes()[column.dataTypeID]);
  }

  protected identifyListedColumnType(column: RawTableColumn): BksFieldType {
    return this.identifyType(column.dataType);
  }

  private identifyType(rawType?: string): BksFieldType {
    const declaration = rawType?.toLowerCase() ?? "";
    // Strips the arguments of varchar(255) and numeric(10,2).
    const type = declaration.split("(")[0].trim();

    if (type === "bool" || type === "boolean") {
      return "BOOLEAN";
    }

    if (type === "bytea") {
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
