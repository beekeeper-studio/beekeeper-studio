import { PostgresData } from "@shared/lib/dialects/postgresql";
import { ChangeBuilderBase } from "./ChangeBuilderBase";

const { wrapLiteral: wL, wrapIdentifier: wI, escapeString: wrapString } = PostgresData



export class PostgresqlChangeBuilder extends ChangeBuilderBase {

  wrapIdentifier = wI
  wrapLiteral = wL
  escapeString = wrapString
}