import { Dialect } from "@shared/lib/dialects/models";
import { ChangeBuilderBase } from "./ChangeBuilderBase";
import { BigQueryData } from "@shared/lib/dialects/bigquery";

const { wrapLiteral: wL, wrapIdentifier: wI, escapeString: wrapString } = BigQueryData;

export class BigQueryChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'bigquery';
  wrapIdentifier = wI;
  wrapLiteral = wL;
  escapeString = wrapString;

  constructor(table: string) {
    super(table);
    console.log("TABLE: ", table);
  }
  
}