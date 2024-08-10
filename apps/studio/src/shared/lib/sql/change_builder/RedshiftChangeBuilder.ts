import { Dialect } from "@shared/lib/dialects/models";
import { RedshiftData } from "@shared/lib/dialects/redshift";
import { PostgresqlChangeBuilder } from "@shared/lib/sql/change_builder/PostgresqlChangeBuilder";

export class RedshiftChangeBuilder extends PostgresqlChangeBuilder {
  dialect: Dialect = 'redshift'
  wrapIdentifier  = RedshiftData.wrapIdentifier
  wrapLiteral = RedshiftData.wrapLiteral
  escapeString = RedshiftData.escapeString
}

