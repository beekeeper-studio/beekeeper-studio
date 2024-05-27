import { IConnection } from "@/common/interfaces/IConnection";
import { CancelableQuery, DatabaseFilterOptions, ExtendedTableColumn, FilterOptions, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, StreamResults, SupportedFeatures, TableChanges, TableColumn, TableFilter, TableIndex, TableInsert, TableOrView, TablePartition, TableProperties, TableResult, TableTrigger, TableUpdateResult } from "@/lib/db/models";
import { DatabaseElement } from "@/lib/db/types";
import { AlterPartitionsSpec, AlterTableSpec, IndexAlterations, RelationAlterations, TableKey } from "@shared/lib/dialects/models";

export interface ConnectionHandlers {
  // Connection management from the store **************************************
  'conn/create': ({config, osUser}: {config: IConnection, osUser: string}) => Promise<void>,
  'conn/test': ({ config, osUser }: {config: IConnection, osUser: string}) => Promise<void>,
  'conn/changeDatbase': ({newDatabase}: {newDatabase: string}) => Promise<void>,
  'conn/clearConnection': () => Promise<void>,

  // DB Metadata ****************************************************************
  'conn/supportedFeatures': () => Promise<SupportedFeatures>,
  'conn/versionString': () => Promise<string>,
  'conn/defaultSchema': () => Promise<string | null>,
  'conn/listCharsets': () => Promise<string[]>,
  'conn/getDefaultCharset': () => Promise<string>,
  'conn/listCollations': ({charset}: {charset: string}) => Promise<string[]>,

  
  // Connection *****************************************************************
  'conn/connect': () => Promise<void>,
  'conn/disconnect': () => Promise<void>,

  
  // List schema information ****************************************************
  'conn/listTables': ({filter}: {filter?: FilterOptions}) => Promise<TableOrView[]>,
  'conn/listViews': ({filter}: {filter?: FilterOptions}) => Promise<TableOrView[]>,
  'conn/listRoutines': ({filter}: {filter?: FilterOptions}) => Promise<Routine[]>,
  'conn/listMaterializedViewColumns': ({table, schema}: {table: string, schema?: string}) => Promise<TableColumn[]>,
  'conn/listTableColumns': ({table, schema}: {table: string, schema?: string}) => Promise<ExtendedTableColumn[]>,
  'conn/listTableTriggers': ({table, schema}: {table: string, schema?: string}) => Promise<TableTrigger[]>,
  'conn/listTableIndexes': ({table, schema}: {table: string, schema?: string}) => Promise<TableIndex[]>,
  'conn/listSchemas': ({filter}: {filter?: SchemaFilterOptions}) => Promise<string[]>,
  'conn/getTableReferences': ({table, schema}: {table: string, schema?: string}) => Promise<string[]>,
  'conn/getTableKeys': ({table, schema}: {table: string, schema?: string}) => Promise<TableKey[]>,
  'conn/listTablePartitions': ({table, schema}: {table: string, schema?: string}) => Promise<TablePartition[]>,
  'conn/query': ({queryText, options}: {queryText: string, options?: any}) => Promise<CancelableQuery>,
  'conn/executeQuery': ({queryText, options}: {queryText: string, options: any}) => Promise<NgQueryResult[]>,
  'conn/listDatabases': ({filter}: {filter?: DatabaseFilterOptions}) => Promise<string[]>,
  'conn/getTableProperties': ({table, schema}: {table: string, schema?: string}) => Promise<TableProperties | null>,
  'conn/getQuerySelectTop': ({table, limit, schema}: {table: string, limit: number, schema?: string}) => Promise<string>,
  'conn/listMaterializedViews': ({filter}: {filter?: FilterOptions}) => Promise<TableOrView[]>,
  'conn/getPrimaryKey': ({table, schema}: {table: string, schema?: string}) => Promise<string | null>,
  'conn/getPrimaryKeys': ({table, schema}: {table: string, schema?: string}) => Promise<PrimaryKeyColumn[]>,


  // Create Structure ***********************************************************
  'conn/createDatabase': ({databaseName, charset, collation}: {databaseName: string, charset: string, collation: string}) => Promise<void>,
  'conn/createDatabaseSQL': () => Promise<string>,
  'conn/getTableCreateScript': ({table, schema}: {table: string, schema?: string}) => Promise<string>,
  'conn/getViewCreateScript': ({view, schema}: {view: string, schema?: string}) => Promise<string[]>,
  'conn/getMaterializedViewCreateScript': ({view, schema}: {view: string, schema?: string}) => Promise<string[]>,
  'conn/getRoutineCreateScript': ({routine, type, schema}: {routine: string, type: string, schema?: string}) => Promise<string[]>,


  // Make Changes ***************************************************************
  'conn/alterTableSql': ({change}: {change: AlterTableSpec}) => Promise<string>,
  'conn/alterTable': ({change}: {change: AlterTableSpec}) => Promise<void>,
  'conn/alterIndexSql': ({changes}: {changes: IndexAlterations}) => Promise<string | null>,
  'conn/alterIndex': ({changes}: {changes: IndexAlterations}) => Promise<void>,
  'conn/alterRelationSql': ({changes}: {changes: RelationAlterations}) => Promise<string | null>,
  'conn/alterRelation': ({changes}: {changes: RelationAlterations}) => Promise<void>,
  'conn/alterPartitionSql': ({changes}: {changes: AlterPartitionsSpec}) => Promise<string | null>,
  'conn/alterPartition': ({changes}: {changes: AlterPartitionsSpec}) => Promise<void>,
  'conn/applyChangesSql': ({changes}: {changes: TableChanges}) => Promise<string>,
  'conn/applyChanges': ({changes}: {changes: TableChanges}) => Promise<TableUpdateResult[]>,
  'conn/setTableDescription': ({table, description, schema}: {table: string, description: string, schema?: string}) => Promise<string>,
  'conn/dropElement': ({elementName, typeOfElement, schema}: {elementName: string, typeOfElement: DatabaseElement, schema?: string}) => Promise<void>,
  'conn/truncateElement': ({elementName, typeOfElement, schema}: {elementName: string, typeOfElement: DatabaseElement, schema?: string}) => Promise<void>,
  'conn/truncateAllTables': ({schema}: {schema?: string}) => Promise<void>,


  // For TableTable *************************************************************
  'conn/getTableLength': ({table, schema}: {table: string, schema?: string}) => Promise<number>,
  'conn/selectTop': ({table, offset, limit, orderBy, filters, schema, selects}: {table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]}) => Promise<TableResult>,
  'conn/selectTopSql': ({table, offset, limit, orderBy, filters, schema, selects}: {table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]}) => Promise<string>,
  'conn/selectTopStream': ({table, orderBy, filters, chunkSize, schema}: {table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string}) => Promise<StreamResults>,


  // For Export *****************************************************************
  'conn/queryStream': ({query, chunkSize}: {query: string, chunkSize: number}) => Promise<StreamResults>,


  // Duplicate Table ************************************************************
  'conn/duplicateTable': ({tableName, duplicateTableName, schema}: {tableName: string, duplicateTableName: string, schema?: string}) => Promise<void>,
  'conn/duplicateTableSql': ({tableName, duplicateTableName, schema}: {tableName: string, duplicateTableName: string, schema?: string}) => Promise<string>,


  'conn/getInsertQuery': ({tableInsert}: {tableInsert: TableInsert}) => Promise<string>,
}
