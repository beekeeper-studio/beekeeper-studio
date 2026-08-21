import { ColumnType, DialectData } from "./models";

// DynamoDB attribute types keyed by the short code the SDK uses, mapped to the
// full readable name shown in the UI (column type picker, structure view, etc).
export const DYNAMO_TYPE_LABELS: Record<string, string> = {
  S: 'String',
  N: 'Number',
  B: 'Binary',
  BOOL: 'Boolean',
  NULL: 'Null',
  M: 'Map',
  L: 'List',
  SS: 'String Set',
  NS: 'Number Set',
  BS: 'Binary Set',
}

// Map a raw DynamoDB attribute-type code to its readable label. Unknown codes
// (shouldn't happen) pass through unchanged.
export function dynamoTypeLabel(code: string | undefined | null): string {
  if (!code) return 'String'
  return DYNAMO_TYPE_LABELS[code] || code
}

export const DynamoDBData: DialectData = {
  sqlLabel: "code",
  columnTypes: Object.values(DYNAMO_TYPE_LABELS).map((t) => new ColumnType(t)),
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
    addDatabase: true,
    importFromFile: true,
    nullable: true,
    defaultValue: true,
    comments: true,
    compositeKeys: true,
    shell: true,
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
    multipleDatabases: true,
    // DynamoDB has no server-side ORDER BY for Scan, so column sorting in the
    // table view isn't available.
    headerSort: true,
    initialSort: true,
  },
  notices: {
    infoSchema: 'DynamoDB is schemaless. Columns shown are discovered from sampled data.',
    infoCreateTable: 'DynamoDB tables are created with a single "id" partition key. Use the AWS Console for more complex table configurations.',
    infoRelations: 'DynamoDB does not support foreign key relationships.',
    infoIndexes: 'Index management is available through the AWS Console.',
  }
}
