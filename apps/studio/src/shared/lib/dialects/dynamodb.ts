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
  wrapIdentifier: (id: string) => id ? `"${id.replaceAll(/"/g, '""')}"` : null,
  unwrapIdentifier: (s) => s,
  disabledFeatures: {
    manualCommit: true,
    rawFilters: true,
    truncateElement: true,
    sqlCreate: true,
    createTable: true,
    importFromFile: true,
    nullable: true,
    defaultValue: true,
    comments: true,
    compositeKeys: true,
    informationSchema: {
      extra: true
    },
    alter: {
      everything: true,
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
    duplicateTable: true,
    erd: true,
    multipleDatabases: true,
    // DynamoDB does not support server-side ORDER BY. Custom sorting would require
    // a full table scan which is expensive and disabled by default.
    headerSort: true,
    initialSort: true,
  },
  notices: {
    infoSchema: 'DynamoDB is schemaless. Columns shown are discovered from sampled data.',
    infoCreateTable: 'DynamoDB tables are created with a single "id" partition key. Use the AWS Console for more complex table configurations.',
    infoRelations: 'DynamoDB does not support foreign key relationships.',
    infoIndexes: 'Index management is available through the AWS Console.',
    infoSorting: 'DynamoDB does not support server-side sorting. Column sorting is disabled to avoid full table scans.',
  }
}
