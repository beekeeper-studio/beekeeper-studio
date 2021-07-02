import { AlterTableSpec, SchemaItem } from "@shared/lib/dialects/models";
import { PostgresData } from "@shared/lib/dialects/postgresql";
import { ChangeBuilderBase } from "./ChangeBuilderBase";

const { wrapLiteral, wrapIdentifier } = PostgresData


// column alteration
function alterType(column: string, newType: string) {
  return `ALTER COLUMN ${wrapIdentifier(column)} TYPE ${wrapLiteral(newType)}`
}

function alterDefault(column: string, newDefault: string) {
  return `ALTER COLUMN ${wrapIdentifier(column)} SET DEFAULT ${wrapLiteral(newDefault)}`
}

function alterNullable(column, nullable: boolean) {
  const direction = nullable ? 'DROP' : 'SET'
  return `ALTER COLUMN ${wrapIdentifier(column)} ${direction} NOT NULL`
}

function renameColumn(column: string, newName: string) {
  return `RENAME COLUMN ${wrapIdentifier(column)} TO ${wrapIdentifier(newName)}`
}

// new columns
function addColumn(item: SchemaItem) {
  
}


export class PostgresqlChangeBuilder extends ChangeBuilderBase {


  alterTable(spec: AlterTableSpec): string {

  }



}