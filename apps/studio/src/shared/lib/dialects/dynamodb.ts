import { ColumnType, DialectData } from "./models";

// DynamoDB attribute types. B = binary, S = string, N = number, plus document
// types (M, L) and scalar types that PartiQL surfaces. These are shown in the
// column-type picker when creating/editing schema elements.
const types = [
  'S', 'N', 'B', 'BOOL', 'NULL', 'L', 'M', 'SS', 'NS', 'BS'
]

export const DynamoDBData: DialectData = {
  sqlLabel: "code",
  columnTypes: types.map((t) => new ColumnType(t)),
  usesOffsetPagination: true,
  textEditorMode: 'text/x-partiql',
  disabledFeatures: {
    manualCommit: true,
    rawFilters: true,
    truncateElement: true,
    sqlCreate: true,
    importFromFile: true,
    nullable: true,
    defaultValue: true,
    comments: true,
    compositeKeys: true,
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
      renameSchema: true,
      renameTable: true,
      renameView: true,
      reorderColumn: true
    },
    triggers: true,
    relations: true,
    constraints: {
      onUpdate: true,
      onDelete: true
    },
    schema: true,
    generatedColumns: true,
  }
}
