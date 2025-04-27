import { ColumnType, DialectData } from "./models";

const types = [
  'double', 'string', 'object', 'array', 'binData', 'objectid',
  'bool', 'date', 'regex', 'javascript', 'int', 'timestamp',
  'long', 'decimal', 'minKey', 'maxKey', 'number'
]

export const MongoDBData: DialectData = {
  columnTypes: types.map((t) => new ColumnType(t)),
  usesOffsetPagination: true,
  queryDialectOverride: 'postgresql',
  textEditorMode: 'text/x-pgsql',
  disabledFeatures: {
    truncateElement: true,
    sqlCreate: true,
    importFromFile: true,
    nullable: true,
    defaultValue: true,
    primary: true,
    comments: true,
    index: {
      id: true,
      primary: true
    },
    informationSchema: {
      extra: true
    },
    alter: {
      addColumn: true,
      dropColumn: true,
      renameColumn: true,
      alterColumn: true,
      multiStatement: true,
      addConstraint: true,
      dropConstraint: true,
      indexes: true,
      renameSchema: true,
      renameView: true,
      reorderColumn: true
    },
    triggers: true,
    relations: true
  }
}
