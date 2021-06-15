import { Dialect, DialectOverride } from 'components'



export interface SchemaItem {
  columnName: string
  dataType: string
  dialectDataTypes: DialectOverride

}

export interface Template {
  name: string,
  dialect: Dialect
  schema: any[],
}