import { Dialect } from "@shared/lib/dialects/models";
import { ChangeBuilderBase } from "./ChangeBuilderBase";
import { SnowflakeData } from "../../dialects/snowflake";

const { wrapIdentifier: wI, escapeString: eS, wrapLiteral: wL } = SnowflakeData;

export class SnowflakeChangeBuilder extends ChangeBuilderBase {
  dialect: Dialect = 'snowflake';
  wrapIdentifier = wI;
  wrapLiteral = wL;
  escapeString = eS;
}
