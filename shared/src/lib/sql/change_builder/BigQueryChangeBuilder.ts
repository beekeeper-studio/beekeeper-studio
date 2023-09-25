import { Dialect, SchemaItem } from "@shared/lib/dialects/models";
import { ChangeBuilderBase } from "./ChangeBuilderBase";
import { BigQueryData } from "@shared/lib/dialects/bigquery";

const { wrapLiteral: wL, wrapIdentifier: wI, escapeString: wrapString } = BigQueryData;

export class BigQueryChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'bigquery';
  wrapIdentifier = wI;
  wrapLiteral = wL;
  escapeString = wrapString;

  database: string;

  constructor(table: string, database: string) {
    super(table);
    this.database = database;
  }

  buildTableName(table: string, _schema?: string) {
    return `${this.wrapIdentifier(this.database)}.${this.wrapIdentifier(table)}`;
  }
  
  addColumn(item: SchemaItem) {

    if (!item.columnName || !item.dataType) {
      throw new Error("can't add a column without name or data type")
    }

    return [
      'ADD COLUMN',
      this.wrapIdentifier(item.columnName),
      this.wrapLiteral(item.dataType),
      item.nullable ? null : 'NOT NULL',
      item.defaultValue ? `DEFAULT ${this.wrapLiteral(item.defaultValue)}` : null,
      item.extra,
      item.comment ? `COMMENT ${this.escapeString(item.comment, true)}` : null
    ].filter((i) => !!i).join(" ")
  }
}