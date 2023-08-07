import { Pool, QueryResult } from "pg";
import { AppContextProvider, BasicDatabaseClient } from "./BasicDatabaseClient";
import { TableKey } from "@shared/lib/dialects/models";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { DatabaseElement, IDbConnectionDatabase, IDbConnectionServer } from "../client";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, CancelableQuery, NgQueryResult, DatabaseFilterOptions, TableChanges, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults } from "../models";

import knexLib from 'knex'
import { VersionInfo } from "./postgresql/types";
import { PostgresqlChangeBuilder } from "@shared/lib/sql/change_builder/PostgresqlChangeBuilder";
import pg from 'pg'


let driverConfigured = false


class PosgtresClientNg extends BasicDatabaseClient<QueryResult> {

  pool: Pool;
  server: IDbConnectionServer
  database: IDbConnectionDatabase
  defaultSchema: () => 'public'

  version: VersionInfo // we fill this in during 'connect'
  readOnlyMode: boolean

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase, cp: AppContextProvider) {
    super(knexLib({ client: 'pg'}), cp)
    this.server = server
    this.database = database
    this.readOnlyMode = server?.config?.readOnlyMode || false
  }


  async disconnect() {
    throw new Error("Method not implemented.");
  }

  async connect() {
    if (!driverConfigured) {
      pg.types.setTypeParser(pg.types.builtins.DATE,        'text', (val) => val); // date
      pg.types.setTypeParser(pg.types.builtins.TIMESTAMP,   'text', (val) => val); // timestamp without timezone
      pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, 'text', (val) => val); // timestamp
      pg.types.setTypeParser(pg.types.builtins.INTERVAL,    'text', (val) => val); // interval (Issue #1442 "BUG: INTERVAL columns receive wrong value when cloning row)
      
      /**
       * Convert BYTEA type encoded to hex with '\x' prefix to BASE64 URL (without '+' and '=').
       */
      pg.types.setTypeParser(17, 'text', (val) => val ? base64.encode(val.substring(2), 'hex') : '');
      driverConfigured = true
    }


    // do the work
  }


    versionString(): string {
        return this.version.version
    }
    // this is POSTGRES ONLY. Redshift should be a subclass
    getBuilder(table: string, schema?: string): ChangeBuilderBase {
        return new PostgresqlChangeBuilder(table, schema)
    }
    supportedFeatures(): SupportedFeatures {

        throw new Error("Method not implemented.");
    }
    listTables(db: string, filter?: FilterOptions): Promise<TableOrView[]> {
        throw new Error("Method not implemented.");
    }
    listViews(filter?: FilterOptions): Promise<TableOrView[]> {
        throw new Error("Method not implemented.");
    }
    listRoutines(filter?: FilterOptions): Promise<Routine[]> {
        throw new Error("Method not implemented.");
    }
    listMaterializedViewColumns(db: string, table: string, schema?: string): Promise<TableColumn[]> {
        throw new Error("Method not implemented.");
    }
    listTableColumns(db: string, table?: string, schema?: string): Promise<ExtendedTableColumn[]> {
        throw new Error("Method not implemented.");
    }
    listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]> {
        throw new Error("Method not implemented.");
    }
    listTableIndexes(db: string, table: string, schema?: string): Promise<TableIndex[]> {
        throw new Error("Method not implemented.");
    }
    listSchemas(db: string, filter?: SchemaFilterOptions): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    getTableReferences(table: string, schema?: string): void {
        throw new Error("Method not implemented.");
    }
    getTableKeys(db: string, table: string, schema?: string): Promise<TableKey[]> {
        throw new Error("Method not implemented.");
    }
    query(queryText: string): CancelableQuery {
        throw new Error("Method not implemented.");
    }
    executeQuery(queryText: string): Promise<NgQueryResult[]> {
        throw new Error("Method not implemented.");
    }
    listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    applyChangesSql(changes: TableChanges): string {
        throw new Error("Method not implemented.");
    }
    applyChanges(changes: TableChanges): Promise<any[]> {
        throw new Error("Method not implemented.");
    }
    getQuerySelectTop(table: string, limit: number, schema?: string): string {
        throw new Error("Method not implemented.");
    }
    getTableProperties(table: string, schema?: string): Promise<TableProperties> {
        throw new Error("Method not implemented.");
    }
    getTableCreateScript(table: string, schema?: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    getViewCreateScript(view: string, schema?: string): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    getRoutineCreateScript(routine: string, type: string, schema?: string): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    truncateAllTables(db: string, schema?: string): void {
        throw new Error("Method not implemented.");
    }
    listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]> {
        throw new Error("Method not implemented.");
    }
    getPrimaryKey(db: string, table: string, schema?: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    getPrimaryKeys(db: string, table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
        throw new Error("Method not implemented.");
    }
    getTableLength(table: string, schema?: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string): Promise<TableResult> {
        throw new Error("Method not implemented.");
    }
    selectTopStream(db: string, table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
        throw new Error("Method not implemented.");
    }
    wrapIdentifier(value: string): string {
        throw new Error("Method not implemented.");
    }
    setTableDescription(table: string, description: string, schema?: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    truncateElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): string {
        throw new Error("Method not implemented.");
    }
    listCharsets(): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    getDefaultCharset(): Promise<string> {
        throw new Error("Method not implemented.");
    }
    listCollations(charset: string): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    createDatabase(databaseName: string, charset: string, collation: string): void {
        throw new Error("Method not implemented.");
    }
    createDatabaseSQL(): string {
        throw new Error("Method not implemented.");
    }
    protected rawExecuteQuery(q: string, options: any): Promise<QueryResult<any>> {
        throw new Error("Method not implemented.");
    }


}