import {  DialectData } from "./models";

export const RedisData: DialectData = {
  columnTypes: [],
  usesOffsetPagination: true,
  queryDialectOverride: 'generic', // TODO: idk what to put there
  textEditorMode: 'text/x-pgsql', // TODO: there's no "redis" mode for codemirror
  disabledFeatures: {
    // rawFilters: true, // TODO: how to disable non-raw filters?
    shell: true,
    // queryEditor: true,
    informationSchema: {
      extra: true,
    },
    tableTable: true,
    indexes: true,
    alter: {
      addColumn: true,
      dropColumn: true,
      renameColumn: true,
      alterColumn: true,
      multiStatement: true,
      addConstraint: true,
      dropConstraint: true,
      everything: true,
      indexes: true,
      renameSchema: true,
      renameTable: true,
      renameView: true,
      reorderColumn: true,
    },
    triggers: true,
    relations: true,
    constraints: {
      onUpdate: true,
      onDelete: true,
    },
    index: {
      id: true,
      desc: true,
      primary: true,
    },
    primary: true,
    defaultValue: true,
    nullable: true,
    createIndex: true,
    comments: true,
    filterWithOR: true,
    backup: true,
    truncateElement: true,
    exportTable: true,
    createTable: true,
    dropTable: true,
    dropSchema: true,
    collations: true,
    importFromFile: true,
    headerSort: true,
    duplicateTable: true,
    export: {
      sql: true,
    },
    schema: true,
    // multipleDatabases: true, // 16 databases by default if not redis cluster
    generatedColumns: true,
    transactions: true,
    chunkSizeStream: true,
    binaryColumn: true,
    initialSort: true,
    multipleDatabase: true,
    sqlCreate: true,
    compositeKeys: true,
    schemaValidation: true,
  }
}
