import { ColumnType, DialectData } from "./models"


const types = [
  'int', 'bigint', 'bit', 'decimal', 'money', 'numeric', 'smallint', 'smallmoney', 'tinyint', 'float', 'real', 'date', 'datetime2', 'datetime', 'datetimeoffset', 'smalldatetime', 'time', 'char', 'varchar', 'text', 'nchar', 'nvarchar', 'ntext', 'binary', 'image', 'varbinary', 'hierarchyid', 'sql_variant', 'timestamp', 'uniqueidentifier', 'xml', 'geometry', 'geography', 'rowversion'
]

const supportsLength = [
  'char', 'varchar', 'nvarchar', 'nchar', 'varbinary'
]

const defaultLength = (t: string) => t.includes('var') ? 255 : 8

export const SqlServerData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t, supportsLength.includes(t), defaultLength(t)))
}