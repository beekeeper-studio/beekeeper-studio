import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from "@/lib/db/clients/BasicDatabaseClient";
import { DatabaseElement, IDbConnectionDatabase } from "@/lib/db/types";
import { Collection, Db, Document, MongoClient, ObjectId } from 'mongodb';
import rawLog from '@bksLogger';
import { BksField, BksFieldType, CancelableQuery, ExtendedTableColumn, NgQueryResult, OrderBy, PrimaryKeyColumn, Routine, SchemaFilterOptions, StreamResults, SupportedFeatures, TableChanges, TableColumn, TableDelete, TableFilter, TableIndex, TableInsert, TableOrView, TableProperties, TableResult, TableTrigger, TableUpdate, TableUpdateResult } from "@/lib/db/models";
import { CreateTableSpec, IndexAlterations, TableKey } from "@/shared/lib/dialects/models";
import _ from 'lodash';
import { MongoDBObjectIdTranscoder } from "@/lib/db/serialization/transcoders";
import vm from "vm";
import { createCancelablePromise } from "@/common/utils";
import { errors } from "@/lib/errors";
import { ChangeBuilderBase } from "@/shared/lib/sql/change_builder/ChangeBuilderBase";

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
  transcoders = [MongoDBObjectIdTranscoder];

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, mongoContext, server, database);
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
  }

  async disconnect() {
    // force disconnect
    await this.conn.close(true);

    await super.disconnect();
  }

  async versionString() {
    const db = this.conn.db(this.database.database);
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
      transactions: false
    }
  }

  override async createDatabase(databaseName: string, _charset: string, _collation: string): Promise<string> {
    this.conn.db(databaseName);
    return databaseName;
  }


  async listTables(): Promise<TableOrView[]> {
    const db = this.conn.db(this.database.database);
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
    const db = this.conn.db(this.database.database);
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
    const collection = this.conn.db(this.database.database).collection(table);

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

  async getTableKeys(_table: string, _schema?: string): Promise<TableKey[]> {
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
        await db.dropCollection(elementName);
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
      await db.collection(elementName).rename(newElementName);
    } else {
      log.warn(`MongoDB does not support renaming ${typeOfElement}`);
    }
  }

  async selectTopSql(_table: string, _offset: number, _limit: number, _orderBy: OrderBy[], _filters: string | TableFilter[], _schema?: string, _selects?: string[]): Promise<string> {
    log.error("MongoDB does not support generating SQL scripts");
    return '';
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<TableResult> {
    const collection = this.conn.db(this.database.database).collection(table);

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


    const result = await collection.aggregate([
      {
        "$match": convertedFilters
      },
      convertedOrders ? {
        "$sort": convertedOrders
      } : null,
      {
        "$skip": offset
      },
      {
        "$limit": limit
      },
      convertedSelects ? {
        "$project": convertedSelects
      } : null
    ].filter((v) => !!v)).toArray();

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
    return await this.conn.db(this.database.database).collection(table).estimatedDocumentCount();
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
    const db = this.conn.db(this.database.database);

    try {
      if (changes.inserts) {
        await this.insertRows(changes.inserts, db);
      }

      if (changes.updates) {
        results = await this.updateValues(changes.updates, db);
      }

      if (changes.deletes) {
        await this.deleteRows(changes.deletes, db);
      }
    } catch (err) {
      log.error('Error applying changes: ', err)
    }
    return results;
  }

  async insertRows(inserts: TableInsert[], connection: Db) {
    for (const insert of inserts) {
      connection.collection(insert.table).insertMany(insert.data);
    }
  }

  async updateValues(updates: TableUpdate[], connection: Db) {
    let results = [];
    for (const update of updates) {
      const filter = { _id: update.primaryKeys[0].value };
      const updateDoc = {
        $set: {
          [update.column]: update.value
        }
      };

      const result = await connection.collection(update.table).findOneAndUpdate(
        filter,
        updateDoc,
        { returnDocument: 'after' }
      );
      results.push(result);
    }
    return results;
  }

  async deleteRows(deletes: TableDelete[], connection: Db) {
    for (const del of deletes) {
      connection.collection(del.table).deleteOne({
        _id: del.primaryKeys[0].value
      });
    }
  }

  override async alterIndex(changes: IndexAlterations): Promise<void> {
    const collection = this.conn.db(this.db).collection(changes.table);

    for (let addition of changes.additions) {
      const indexSpec = addition.columns.reduce((obj, col) => ({
        ...obj,
        [col.name]: this.convertOrder(col.order)
      }), {});
      log.info('INDEX SPEC: ', indexSpec)
      await collection.createIndex(indexSpec);
    }

    for (let drop of changes.drops) {
      await collection.dropIndex(drop.name);
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

  async executeQuery(queryText: string, _options?: any): Promise<NgQueryResult[]> {
    const db = this.conn.db(this.database.database);

    let result = [];

    let display = function (data: any) {
      result.push(this.parseRowQueryResult(data));
    }
    const sandbox = {
      db,
      display: display.bind(this)
    };

    const userScript = `
      (async () => {
        ${queryText}
      })()
    `

    vm.createContext(sandbox)
    await vm.runInContext(userScript, sandbox)

    return result;
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

  async selectTopStream(_table: string, _orderBy: OrderBy[], _filters: string | TableFilter[], _chunkSize: number, _schema?: string): Promise<StreamResults> {
    log.error('MongoDB does not currently support streaming results');
    return null;
  }

  async queryStream(_query: string, _chunkSize: number): Promise<StreamResults> {
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
        condition = { [filter.field]: { [mongoOp]: filter.value }};
      } else if (filter.type === "like" && _.isString(filter.value)) {
        const reg = (filter.value as string).replace(/%/g, ".*").replace(/_/g, ".");
        condition = {
          [filter.field]: {
            [mongoOp]: reg,
            $options: "i" // case-insensitive
          }
        };
      } else if (filter.type.includes('is')) {
        condition = {
          [filter.field]: { [mongoOp]: null }
        };
      } else {
        condition = { [filter.field]: { [mongoOp]: filter.value }};
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

    return result;
  }
}
