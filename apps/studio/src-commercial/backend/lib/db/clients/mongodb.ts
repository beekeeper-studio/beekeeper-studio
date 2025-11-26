import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from "@/lib/db/clients/BasicDatabaseClient";
import { DatabaseElement, IDbConnectionDatabase } from "@/lib/db/types";
import { AggregationCursor, Collection, Db, Document, MongoClient, ObjectId } from 'mongodb';
import { identify } from 'sql-query-identifier';
import rawLog from '@bksLogger';
import { BksField, BksFieldType, CancelableQuery, ExtendedTableColumn, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, StreamResults, SupportedFeatures, TableChanges, TableColumn, TableDelete, TableFilter, TableIndex, TableInsert, TableOrView, TableProperties, TableResult, TableTrigger, TableUpdate, TableUpdateResult } from "@/lib/db/models";
import { CreateTableSpec, IndexAlterations, TableKey } from "@/shared/lib/dialects/models";
import _ from 'lodash';
import { MongoDBObjectIdTranscoder } from "@/lib/db/serialization/transcoders";
import { ElectronRuntime as MongoRuntime } from '@mongosh/browser-runtime-electron';
import { NodeDriverServiceProvider } from '@mongosh/service-provider-node-driver';
import { createCancelablePromise } from "@/common/utils";
import { errors } from "@/lib/errors";
import EventEmitter from "events";
import { ChangeBuilderBase } from "@/shared/lib/sql/change_builder/ChangeBuilderBase";
import { QueryLeaf } from '@queryleaf/lib'
import { MongoDBCursor } from './mongodb/MongoDBCursor';
import { wrapIdentifier } from "@/lib/db/clients/postgresql"; 
import knexlib from 'knex'

const knex = knexlib({ client: 'pg' })

const log = rawLog.scope('mongodb');

interface QueryResult {
  columns: { name: string }[]
  rows: any[][] | Record<string, any>[];
  arrayMode: boolean;
}

const mongoContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null
  }
}

export class MongoDBClient extends BasicDatabaseClient<QueryResult> {
  conn: MongoClient;
  runtime: MongoRuntime;
  queryLeaf: QueryLeaf;
  transcoders = [MongoDBObjectIdTranscoder];

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, mongoContext, server, database);
  }

  async connect(): Promise<void> {
    await super.connect();

    this.conn = new MongoClient(this.server.config.url);

    this.conn.on('connectionCreated', (event) => {
      log.debug('Pool connection %d acquired on %s', event.connectionId, event.address);
    })

    this.conn.on('connectionClosed', (event) => {
      log.debug('Pool connection %d closed on %s', event.connectionId, event.address);
    })

    // pre connect to pool
    await this.conn.connect();

    // @ts-ignore
    const service = new NodeDriverServiceProvider(this.conn, new EventEmitter(), { productDocsLink: '', productName: 'BeekeeperStudio' });
    this.runtime = new MongoRuntime(service);
    this.runtime.evaluate(`use ${this.db}`)

    this.queryLeaf = new QueryLeaf(this.conn, this.db);
  }

  async disconnect() {
    // force disconnect
    await this.conn.close(true);

    await super.disconnect();
  }

  async versionString() {
    const db = this.conn.db(this.db);
    const buildInfo = await db.command({ buildInfo: 1 });

    return buildInfo.version;
  }


  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: false,
      comments: false,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
      transactions: false,
      filterTypes: ['standard', 'ilike']
    }
  }

  override async createDatabase(databaseName: string, _charset: string, _collation: string): Promise<string> {
    this.conn.db(databaseName);
    return databaseName;
  }


  async listTables(): Promise<TableOrView[]> {
    const db = this.conn.db(this.db);
    const collections = await db.listCollections().toArray();
    return collections.map((col) => {
      return {
        name: col.name
      } as TableOrView
    })
  }

  async listViews(): Promise<TableOrView[]> {
    return [];
  }

  async listRoutines(): Promise<Routine[]> {
    return [];
  }

  async listMaterializedViews(): Promise<TableOrView[]> {
    return [];
  }

  async listMaterializedViewColumns(_table: string, _schema?: string): Promise<TableColumn[]> {
    return [];
  }

  // TODO(@day): we need to figure out how to display cols that may have multiple types
  async listTableColumns(table?: string): Promise<ExtendedTableColumn[]> {
    const db = this.conn.db(this.db);
    if (table) {
      const cols = await this.getCollectionCols(db.collection(table));
      return cols.map((col) => ({
        tableName: table,
        columnName: col.field,
        dataType: col.types[0]
      } as ExtendedTableColumn));
    } else {
      const collections = await db.collections();
      return (await Promise.all(collections.map(async (value) => {
        const cols = await this.getCollectionCols(value);
        return cols.map((col) => ({
          tableName: value.collectionName,
          columnName: col.field,
          dataType: col.types[0],
          bksField: this.parseTableColumn({ field: col.field, type: col.types[0] })
        } as ExtendedTableColumn))
      }))).flat();
    }
  }

  async listTableTriggers(_table: string, _schema?: string): Promise<TableTrigger[]> {
    return [];
  }

  async listTableIndexes(table: string, _schema?: string): Promise<TableIndex[]> {
    const collection = this.conn.db(this.db).collection(table);

    const indexes = await collection.indexes({ full: true });

    // TODO (@day): convert 1, -1 to ASC and DESC
    return indexes.map((index) => ({
      table, 
      columns: Object.entries(index.key).map((key) => ({ name: key[0], order: this.convertOrder(key[1])})),
      name: index.name,
      unique: index.unique,
    } as TableIndex));
  }

  async listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    return [];
  }

  async getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return [];
  }

  async getOutgoingKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    return [];
  }

  async getIncomingKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    return [];
  }

  async listDatabases(): Promise<string[]> {
    const admin = this.conn.db().admin();
    const dbInfo = await admin.listDatabases();
    return dbInfo.databases.map((d) => d.name);
  }

  async createTable(table: CreateTableSpec): Promise<void> {
    const db = this.conn.db(this.db);

    await db.createCollection(table.table);
  }

  async duplicateTable(tableName: string, duplicateTableName: string): Promise<void> {
    const db = this.conn.db(this.db);

    // Using .toArray just so we can await the pipeline
    await db.collection(tableName).aggregate([{ $out: duplicateTableName }]).toArray();
  }

  async dropElement(elementName: string, typeOfElement: DatabaseElement): Promise<void> {
    const db = this.conn.db(this.db);
    switch (typeOfElement) {
      case DatabaseElement.TABLE:
        try {
          await db.dropCollection(elementName);
          log.debug(`Dropped collection ${elementName}`);
        } catch (err) {
          log.error(`Error dropping collection ${elementName}:`, err);
          throw err;
        }
        break;
      case DatabaseElement.DATABASE:
        await db.dropDatabase();
        break;
      default:
        log.warn(`MongoDB does not support dropping ${typeOfElement}`);
    }
  }

  override async setElementName(elementName: string, newElementName: string, typeOfElement:DatabaseElement): Promise<void> {
    const db = this.conn.db(this.db);

    if (typeOfElement == DatabaseElement.TABLE) {
      try {
        // Check if target name already exists
        const targetCollections = await db.listCollections({ name: newElementName }).toArray();
        if (targetCollections.length > 0) {
          throw new Error(`Target collection ${newElementName} already exists`);
        }
        
        // Perform the rename operation
        await db.collection(elementName).rename(newElementName);
      } catch (err) {
        log.error(`Error renaming collection from ${elementName} to ${newElementName}:`, err);
        throw err;
      }
    } else {
      log.warn(`MongoDB does not support renaming ${typeOfElement}`);
    }
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[] = ['*']): Promise<string> {
    let orderByString = ""
    let filterString = ""
    let params: (string | string[])[] = []

    if (orderBy && orderBy.length > 0) {
      orderByString = "ORDER BY " + (orderBy.map((item) => {
        if (_.isObject(item)) {
          return `${wrapIdentifier(item.field)} ${item.dir.toUpperCase()}`
        } else {
          return wrapIdentifier(item)
        }
      })).join(",")
    }

    if (_.isString(filters)) {
      filterString = `WHERE ${filters}`
    } else if (filters && filters.length > 0) {
      let paramIdx = 1
      const allFilters = filters.map((item) => {
        if (item.type === 'in' && _.isArray(item.value)) {
          const values = item.value.map((v, idx) => {
            return knex.raw('?', [v]).toQuery();
          })
          paramIdx += values.length
          return `${wrapIdentifier(item.field)} ${item.type.toUpperCase()} (${values.join(',')})`
        } else if (item.type.includes('is')) {
          return `${wrapIdentifier(item.field)} ${item.type.toUpperCase()} NULL`
        }
        const value = knex.raw('?', [item.value]);
        paramIdx += 1
        return `${wrapIdentifier(item.field)} ${item.type.toUpperCase()} ${value}`
      })
      filterString = "WHERE " + joinFilters(allFilters, filters)

      params = filters.filter((item) => !!item.value).flatMap((item) => {
        return _.isArray(item.value) ? item.value : [item.value]
      })
    }

    const selectSQL = `SELECT ${selects.join(', ')}`
    const baseSQL = `
      FROM ${wrapIdentifier(table)}
      ${filterString}
    `

    const query = `
      ${selectSQL} ${baseSQL}
      ${orderByString}
      ${_.isNumber(limit) ? `LIMIT ${limit}` : ''}
      ${_.isNumber(offset) ? `OFFSET ${offset}` : ''}
      `;

    return query;
  }

  private buildSelectTopCursor(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], selects?: string[], batchSize?: number): AggregationCursor {
    const collection = this.conn.db(this.db).collection(table);

    const convertedOrders = orderBy.length > 0 ? orderBy.reduce((all, ord) => ({
      ...all,
      [ord.field]: ord.dir.toLowerCase() === 'asc' ? 1 : -1 
    }), {} as any) : null;
    const convertedFilters = !_.isString() && filters.length > 0 ? this.convertFilters(filters as TableFilter[]) : {};
    let convertedSelects = null;
    if (selects && selects?.length > 0 && !selects.includes('*')) {
      let init = {} as any;
      if (!selects.includes('_id')) {
        init = {
          _id: 0
        };
      }
      selects = _.without(selects, '_id');
      convertedSelects = selects.reduce((all, sel) => ({
        ...all,
        [sel]: 1
      }), init);
    }

    let skip = null;
    if (offset) {
      skip = {
        "$skip": offset
      };
    }

    let limitObj = null;
    if (limit) {
      limitObj = {
        "$limit": limit
      };
    }

    const options: any = {};

    if (batchSize) {
      options.batchSize = batchSize;
    }

    const result = collection.aggregate([
      {
        "$match": convertedFilters
      },
      convertedOrders ? {
        "$sort": convertedOrders
      } : null,
      skip,
      limitObj,
      convertedSelects ? {
        "$project": convertedSelects
      } : null
    ].filter((v) => !!v), options);

    return result;
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<TableResult> {
    const result = await this.buildSelectTopCursor(table, offset, limit, orderBy, filters, selects).toArray();

    const fields = this.parseQueryResultColumns(result[0] || {});
    const rows = await this.serializeQueryResult({ rows: result, columns: [], arrayMode: false }, fields)

    return { result: rows, fields: [] }
  }

  parseQueryResultColumns(row: any): BksField[] {
    if (!row) return;
    return Object.keys(row).map((column) => {
      let bksType: BksFieldType = 'UNKNOWN';
      if (row[column] instanceof ObjectId) {
        bksType = 'OBJECTID';
      }
      return { name: column, bksType };
    })
  }
  

  async getPrimaryKeys(_table: string, _schema?: string): Promise<PrimaryKeyColumn[]> {
    return [{
      columnName: '_id',
      position: 0
    }];
  }

  async getTableLength(table: string, _schema?: string): Promise<number> {
    return await this.conn.db(this.db).collection(table).estimatedDocumentCount();
  }

  async getTableProperties(table: string, _schema?: string): Promise<TableProperties> {
    const indexes = await this.listTableIndexes(table);

    return {
      indexes,
      relations: [],
      triggers: [],
      partitions: []
    }
  }

  async executeApplyChanges(changes: TableChanges): Promise<TableUpdateResult[]> {
    let results = [];
    const db = this.conn.db(this.db);

    try {
      if (changes.inserts && changes.inserts.length > 0) {
        await this.insertRows(changes.inserts, db);
      }

      if (changes.updates && changes.updates.length > 0) {
        results = await this.updateValues(changes.updates, db);
      }

      if (changes.deletes && changes.deletes.length > 0) {
        await this.deleteRows(changes.deletes, db);
      }
    } catch (err) {
      log.error('Error applying changes: ', err);
      throw new Error(`Failed to apply changes: ${err.message}`);
    }
    return results;
  }

  async insertRows(inserts: TableInsert[], connection: Db) {
    const errors = [];
    
    for (const insert of inserts) {
      try {
        if (!insert.table) {
          throw new Error("Missing table name for insert operation");
        }
        
        const collection = connection.collection(insert.table);
        await collection.insertMany(insert.data);
        
        log.debug(`Inserted ${insert.data.length} documents into ${insert.table}`);
      } catch (err) {
        log.error(`Error inserting into ${insert.table}:`, err);
        errors.push(`Failed to insert into ${insert.table}: ${err.message}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }
  }

  async updateValues(updates: TableUpdate[], connection: Db) {
    let results = [];
    const errors = [];
    
    for (const update of updates) {
      try {
        if (!update.table) {
          throw new Error("Missing table name for update operation");
        }
        
        if (!update.primaryKeys || update.primaryKeys.length === 0) {
          throw new Error(`No primary key provided for update in table ${update.table}`);
        }
        
        // Safely convert ObjectId string to actual ObjectId
        let idValue = update.primaryKeys[0].value;
        try {
          if (ObjectId.isValid(idValue)) {
            idValue = new ObjectId(idValue);
          }
        } catch (err) {
          log.error(`Error converting ObjectId ${idValue}:`, err);
          // Continue with the original value if conversion fails
        }
        
        const filter = { _id: idValue };
        
        // Handle value conversion for special types if needed
        let fieldValue = update.value;
        
        // Create the update document
        const updateDoc = {
          $set: {
            [update.column]: fieldValue
          }
        };

        // Get collection
        const collection = connection.collection(update.table);

        // Perform the update
        const result = await collection.findOneAndUpdate(
          filter,
          updateDoc,
          { 
            returnDocument: 'after',
          }
        );
        
        if (!result) {
          throw new Error(`Failed to update document with _id ${idValue} in ${update.table}`);
        }
        
        results.push(result);
        log.debug(`Updated document in ${update.table} with _id ${idValue}, column: ${update.column}`);
      } catch (err) {
        const errMsg = `Error updating ${update.table}: ${err.message}`;
        log.error(errMsg);
        errors.push(`Failed to update ${update.table}: ${err.message}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }
    
    return results;
  }

  async deleteRows(deletes: TableDelete[], connection: Db) {
    const errors = [];
    
    for (const del of deletes) {
      try {
        if (!del.table) {
          throw new Error("Missing table name for delete operation");
        }
        
        if (!del.primaryKeys || del.primaryKeys.length === 0) {
          throw new Error(`No primary key provided for delete in table ${del.table}`);
        }
        
        // Safely convert ObjectId string to actual ObjectId if needed
        let idValue = del.primaryKeys[0].value;
        try {
          if (ObjectId.isValid(idValue)) {
            idValue = new ObjectId(idValue);
          }
        } catch (err) {
          log.error(`Error converting ObjectId ${idValue}:`, err);
          // Continue with the original value if conversion fails
        }

        const collection = connection.collection(del.table);

        // Perform the delete operation
        const result = await collection.deleteOne({
          _id: idValue
        });
        
        if (result.deletedCount === 0) {
          log.warn(`Failed to delete document with _id ${idValue} in ${del.table}`);
        } else {
          log.debug(`Successfully deleted document from ${del.table} with _id ${idValue}`);
        }
      } catch (err) {
        const errMsg = `Error deleting from ${del.table}: ${err.message}`;
        log.error(errMsg);
        errors.push(`Failed to delete from ${del.table}: ${err.message}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }
  }

  override async alterIndex(changes: IndexAlterations): Promise<void> {
    const errors = [];
    const db = this.conn.db(this.db);
    
    try {
      // Verify collection exists
      const collections = await db.listCollections({ name: changes.table }).toArray();
      if (collections.length === 0) {
        throw new Error(`Collection ${changes.table} does not exist`);
      }
      
      const collection = db.collection(changes.table);

      // Process index additions
      for (let addition of changes.additions) {
        try {
          // Convert column order specifications to MongoDB format
          const indexSpec = addition.columns.reduce((obj, col) => ({
            ...obj,
            [col.name]: this.convertOrder(col.order)
          }), {});
          
          // Prepare index options
          const indexOptions: any = {
            name: addition.name,
          };
          
          // Add unique option if specified
          if (addition.unique) {
            indexOptions.unique = true;
          }
          
          log.debug(`Creating index ${addition.name} on ${changes.table} with spec:`, indexSpec);
          
          // Create the index
          await collection.createIndex(indexSpec, indexOptions);
          log.debug(`Successfully created index ${addition.name} on ${changes.table}`);
        } catch (err) {
          const errorMsg = `Error creating index ${addition.name} on ${changes.table}: ${err.message}`;
          log.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Process index drops
      for (let drop of changes.drops) {
        try {
          log.debug(`Dropping index ${drop.name} from ${changes.table}`);
          await collection.dropIndex(drop.name);
          log.debug(`Successfully dropped index ${drop.name} from ${changes.table}`);
        } catch (err) {
          const errorMsg = `Error dropping index ${drop.name} from ${changes.table}: ${err.message}`;
          log.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      // If any errors occurred, throw a combined error
      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }
    } catch (err) {
      log.error(`Error altering indexes for ${changes.table}:`, err);
      throw err;
    }
  }
  async query(queryText: string, _options?: any): Promise<CancelableQuery> {
    const cancelable = createCancelablePromise(errors.CANCELED_BY_USER);
    let canceling = false;

    // This doesn't actually cancel the query
    return {
      execute: async (): Promise<NgQueryResult[]> => {
        try {
          const data = await Promise.race([
            cancelable.wait(),
            this.executeQuery(queryText)
          ])

          return data;
        } catch (err) {
          if (canceling) {
            canceling = false;
            err.sqlectronError = 'CANCELED_BY_USER';
          }

          throw err;
        } finally {
          cancelable.discard();
        }
      },
      cancel: async (): Promise<void> => {
        canceling = true;

        cancelable.cancel();
      }
    }
  }

  parseRowQueryResult(data: any): NgQueryResult {
    const fieldNames = _.isArray(data) ? Object.keys(data[0]) : Object.keys(data);
    const fields = fieldNames.map((field) => ({
      dataType: 'user-defined',
      id: field,
      name: field
    }));

    return {
      rows: data,
      fields
    }
  }

  async getCompletions(cmd: string): Promise<string[]> {
    return (await this.runtime.getCompletions(cmd)).map((c) => c.completion)
  }

  async getShellPrompt(): Promise<string> {
    return await this.runtime.getShellPrompt()
  }

  async executeQuery(queryText: string, _options?: any): Promise<NgQueryResult[]> {
    const queries = this.identifyCommands(queryText).map((q) => q.text);
    let results = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const r = await this.queryLeaf.execute(query);
      let fields = [];
      if (r) {
        let f = [];
        if (_.isArray(r)) {
          f = _.uniq(_.flatten(_.takeRight(r, 10).map((obj) => Object.keys(obj))))
        } else {
          f = Object.keys(r);
        }
        fields = f.map((k) => ({
          name: k,
          id: k
        }));
      }

      let returnResult = true;

      let affectedRows = 0
      if (r?.acknowledged) {
        affectedRows = r?.insertedCount ?? r?.deletedCount ?? r?.modifiedCount;
        returnResult = false;
      }

      let result = _.isArray(r) ? r : [r];
      if (!returnResult) result = [];

      results.push({
        rows: result,
        rowCount: r?.length ?? 0,
        affectedRows,
        fields,
        command: query
      })
    }

    return results;
  }

  private identifyCommands(queryText: string) {
    try {
      return identify(queryText, { strict: false, dialect: 'psql' });
    } catch (err) {
      return [];
    }
  }

  async executeCommand(commandText: string, _options?: any): Promise<NgQueryResult[]> {
    let results: NgQueryResult[] = [];

    const listener = {
      onPrint: (value): void => {
        value.map((v) => {
          results.push({
            output: v.printable
          })
        })
      }
    }

    this.runtime.setEvaluationListener(listener);

    const ev = await this.runtime.evaluate(commandText);

    let fields = [];
    if (ev.type === 'Cursor' || ev.type === 'AggregationCursor') {
      if (ev.printable?.documents?.length > 0) {
        fields = Object.keys(ev.printable?.documents[0]).map((k) => ({
          name: k,
          id: k
        }));
      }
      results.push({
        rows: ev.printable?.documents,
        rowCount: ev.printable?.documents?.length,
        fields,
        tableName: ev.source?.namespace?.collection ?? 'mycollection',
        command: commandText
      })
    } else if (ev.type === 'Document') {
      if (ev.printable) {
        fields = Object.keys(ev.printable).map((k) => ({
          name: k,
          id: k
        }));
      }
      results.push({
        rows: ev.printable ? [ev.printable] : [],
        rowCount: ev.printable ? 1 : 0,
        fields,
        tableName: ev.source?.namespace?.collection ?? 'mycollection',
        command: commandText
      })
    } else if (ev.type === null && ev.printable) {
      if (typeof ev.printable === 'number') {
        results.push({
          rows: [{ count: ev.printable }],
          rowCount: 1,
          fields: [{ name: 'count', id: 'count' }],
          command: commandText
        });
      } else {
        if (ev.printable?.length > 0) {
          fields = Object.keys(ev.printable[0]).map((k) => ({
            name: k,
            id: k
          }));
        }
        results.push({
          rows: ev.printable,
          rowCount: ev.printable?.length,
          fields,
          tableName: ev.source?.namespace?.collection ?? 'mycollection',
          command: commandText
        })
      }
    }
    log.debug("RESULTS: ", results);

    return results;
  }

  // ********************** UNSUPPORTED ***************************
  setTableDescription(_table: string, _description: string, _schema?: string): Promise<string> {
    throw new Error("Mongo does not support collection descriptions");
  }

  getBuilder(_table: string, _schema?: string): ChangeBuilderBase | Promise<ChangeBuilderBase> {
    throw new Error("Mongo does not support generating SQL");
  }

  createDatabaseSQL(): Promise<string> {
    throw new Error("Mongo does not support generating SQL");
  }

  getTableCreateScript(_table: string, _schema?: string): Promise<string> {
    throw new Error("Mongo does not support generating SQL");
  }

  getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    throw new Error("Mongo does not support generating SQL");
  }

  getRoutineCreateScript(_routine: string, _type: string, _schema?: string): Promise<string[]> {
    throw new Error("Mongo does not support generating SQL");
  }

  setElementNameSql(_elementName: string, _newElementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    throw new Error("Mongo does not support generating SQL");
  }

  truncateElementSql(_elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    throw new Error("Mongo does not support generating SQL");
  }

  truncateAllTables(_schema?: string): Promise<void> {
    throw new Error("Mongo does not support truncation");
  }

  duplicateTableSql(_tableName: string, _duplicateTableName: string, _schema?: string): Promise<string> {
    throw new Error("Mongo does not support generating SQL");
  }

  async getQuerySelectTop(_table: string, _limit: number, _schema?: string): Promise<string> {
    log.error('MongoDB does not support generating queries');
    return '';
  }

  async getPrimaryKey(_table: string, _schema?: string): Promise<string> {
    log.error('MongoDB does not support keys');
    return '';
  }

  async listCharsets(): Promise<string[]> {
    return [];
  }

  async getDefaultCharset(): Promise<string> {
    return null;
  }

  async listCollations(_charset: string): Promise<string[]> {
    return [];
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, _schema?: string): Promise<StreamResults> {
    const cursor = this.buildSelectTopCursor(table, null, null, orderBy, filters, null, chunkSize);

    const columns = await this.listTableColumns(table);

    const cursorOpts = {
      cursor,
      chunkSize
    };

    return {
      totalRows: 0,// need to figure this out
      columns,
      cursor: new MongoDBCursor(cursorOpts)
    };
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    const cursorOpts = {
      query: query,
      queryLeaf: this.queryLeaf,
      chunkSize
    };

    const { columns, totalRows } = await this.getColumnsAndTotalRows(query);

    return {
      totalRows,
      columns,
      cursor: new MongoDBCursor(cursorOpts)
    }
    log.error('MongoDB does not support querying');
    return null;
  }

  wrapIdentifier(_value: string): string {
    log.error('MongoDB does not support querying');
    return '';
  }

  protected async rawExecuteQuery(_q: string, _options: any): Promise<QueryResult | QueryResult[]> {
    log.error('MongoDB does not support querying');
    return null;
  }

  protected parseTableColumn(column: { field: string, type: string }): BksField {
    return {
      name: column.field,
      bksType: column.type === 'objectid' ? 'OBJECTID' : 'UNKNOWN'
    }
  }

  // MongoDB Schema Validation Support
  async getCollectionValidation(collectionName: string): Promise<any> {
    try {
      const db = this.conn.db(this.db);
      
      // Run listCollections with the filter to get the specified collection info
      const collections = await db.listCollections({ name: collectionName }, { nameOnly: false }).toArray();
      
      if (collections.length === 0) {
        throw new Error(`Collection ${collectionName} not found`);
      }
      
      const collectionInfo = collections[0];
      
      // Return the validation information if it exists
      return {
        validator: collectionInfo.options?.validator || null,
        validationLevel: collectionInfo.options?.validationLevel || 'moderate',
        validationAction: collectionInfo.options?.validationAction || 'error'
      };
    } catch (err) {
      log.error(`Error getting collection validation for ${collectionName}:`, err);
      throw err;
    }
  }
  
  async setCollectionValidation(params: {
    collection: string,
    validationLevel: 'off' | 'strict' | 'moderate',
    validationAction: 'error' | 'warn',
    schema: any
  }): Promise<void> {
    try {
      const db = this.conn.db(this.db);
      
      // Create the validator command
      const command = {
        collMod: params.collection,
        validator: { $jsonSchema: params.schema },
        validationLevel: params.validationLevel,
        validationAction: params.validationAction
      };
      
      // Run the command to modify the collection
      await db.command(command);
      
      log.debug(`Updated validation for collection ${params.collection}`);
    } catch (err) {
      log.error(`Error setting collection validation for ${params.collection}:`, err);
      throw err;
    }
  }

  // ******************* UTILS *******************************

  private convertOrder(order: any) {
    if (order === 1) {
      return 'ASC';
    } else if (order === -1) {
      return 'DESC';
    } else if (order === 'ASC') {
      return 1;
    } else if (order === 'DESC') {
      return -1;
    } else {
      return order;
    }
  }
  
  private async getCollectionCols(collection: Collection<Document>) {
    // Take the last 10 docs from a collection and hope that's an accurate representation of the whole collection lol
    return await collection.aggregate(
      [
        {
          "$sort": {
            "_id": -1
          }
        },
        {
          "$limit": 10
        },
        {
          "$project": {
            "fields": {
              "$map": {
                "input": { "$objectToArray": "$$ROOT" },
                "as": "field",
                "in": {
                  "name": "$$field.k",
                  "type": { "$type": "$$field.v" }
                }
              }
            }
          }
        },
        {
          "$unwind": "$fields"
        },
        {
          "$group": {
            "_id": "$fields.name",
            "types": { "$addToSet": "$fields.type" }
          }
        },
        {
          "$project": {
            "_id": 0,
            "field": "$_id",
            "types": 1
          }
        },
        {
          "$sort": { "field": 1 }
        }
      ]
    ).toArray();
  }

  private translateOperator(type: string): string {
    const opMap = {
      "=": "$eq",
      "!=": "$ne",
      "like": "$regex", // special case for regex
      "ilike": "$regex", // special case for regex
      "not like": "$not", // special case for not regex
      "not ilike": "$regex", // special case for regex
      "<": "$lt",
      "<=": "$lte",
      ">": "$gt",
      ">=": "$gte",
      "in": "$in",
      "is": "$eq",
      "is not": "$neq"
    };
    return opMap[type] || null;
  }

  private convertValueForFilter(value: any) {
    if (ObjectId.isValid(value)) {
      return new ObjectId(value);
    } else if (value === 'true' || value === 'false') {
      return value === 'true';
    }
    return value;
  }

  private convertFilters(filters: TableFilter[]) {

    let result = null;
    filters.forEach((filter, index) => {
      const mongoOp = this.translateOperator(filter.type);
      if (!mongoOp) {
        log.warn(`Unsupported operator: ${filter.type}`);
        return;
      }

      let condition: Document;
      if (filter.type === "in") {
        if (!_.isArray(filter.value)) {
          log.warn(`Value for "in" must be an array: ${JSON.stringify(filter)}`);
        }
        const value = filter.value.map((v) => this.convertValueForFilter(v));
        condition = { [filter.field]: { [mongoOp]: value }};
      } else if (filter.type === "ilike" && _.isString(filter.value)) {
        const reg = (filter.value as string).replace(/%/g, ".*").replace(/_/g, ".");
        condition = {
          [filter.field]: {
            [mongoOp]: reg,
            $options: "i" // case-insensitive
          }
        };
      } else if (filter.type === "like" && _.isString(filter.value)) {
        const reg = (filter.value as string).replace(/%/g, ".*").replace(/_/g, ".");
        condition = {
          [filter.field]: {
            [mongoOp]: reg
          }
        };
      } else if (filter.type === "not like" && _.isString(filter.value)) {
        const reg = (filter.value as string).replace(/%/g, ".*").replace(/_/g, ".");
        condition = {
          [filter.field]: {
            $not: {
              $regex: reg
            }
          }
        };
      } else if (filter.type === "not ilike" && _.isString(filter.value)) {
        const reg = (filter.value as string).replace(/%/g, ".*").replace(/_/g, ".");
        condition = {
          [filter.field]: {
            $not: {
              $regex: reg,
              $options: "i" // case-insensitive
            }
          }
        };
      } else if (filter.type.includes('is')) {
        condition = {
          [filter.field]: { [mongoOp]: null }
        };
      } else {
        condition = { [filter.field]: { [mongoOp]: this.convertValueForFilter(filter.value) }};
      }

      if (index === 0) {
        result = condition;
      } else {
        if (filter.op === "AND") {
          result = { $and: [result, condition] };
        } else if (filter.op === "OR") {
          result = { $or: [result, condition] };
        }
      }

    });

    log.info('FILTER: ', result)

    return result;
  }
}
