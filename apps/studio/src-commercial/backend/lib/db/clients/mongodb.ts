import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { BaseV1DatabaseClient } from "@/lib/db/clients/BaseV1DatabaseClient";
import { ExecutionContext, QueryLogOptions } from "@/lib/db/clients/BasicDatabaseClient";
import { IDbConnectionDatabase } from "@/lib/db/types";
import { Collection, Document, MongoClient } from 'mongodb';
import rawLog from '@bksLogger';
import { ExtendedTableColumn, OrderBy, PrimaryKeyColumn, Routine, SupportedFeatures, TableFilter, TableIndex, TableOrView, TableProperties, TableResult } from "@/lib/db/models";
import { TableKey } from "@/shared/lib/dialects/models";
import _ from 'lodash';

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

export class MongoDBClient extends BaseV1DatabaseClient<QueryResult> {

  conn: MongoClient;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, mongoContext, server, database);
  }

  async connect(): Promise<void> {
    await super.connect();

    // configDatabase

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

  async getVersion() {
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

  async listDatabases(): Promise<string[]> {
    const admin = this.conn.db().admin();
    const dbInfo = await admin.listDatabases();
    return dbInfo.databases.map((d) => d.name);
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

  async listMaterializedViews(): Promise<TableOrView[]> {
    return [];
  }

  async listRoutines(): Promise<Routine[]> {
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
          dataType: col.types[0]
        } as ExtendedTableColumn))
      }))).flat();
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

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<TableResult> {
    const collection = this.conn.db(this.database.database).collection(table);

    const convertedOrders = orderBy.length > 0 ? orderBy.reduce((all, ord) => ({
      ...all,
      [ord.field]: ord.dir.toLowerCase() === 'asc' ? 1 : -1 
    }), {} as any) : {};
    const convertedFilters = !_.isString() && filters.length > 0 ? this.convertFilters(filters as TableFilter[]) : {};
    log.info('convertedFilters: ', JSON.stringify(convertedFilters));
    let selectProject = [];
    if (selects.length > 0 && !selects.includes('*')) {
      
      let init = {} as any;
      if (!selects.includes('_id')) {
        init = {
          _id: 0
        };
      }
      selects = _.without(selects, '_id');
      const convertedSelects = selects.reduce((all, sel) => ({
        ...all,
        [sel]: 1
      }), init);

      selectProject = [{
        "$project": convertedSelects
      }];
    }


    const result = await collection.aggregate([
      {
        "$match": convertedFilters
      },
      {
        "$sort": convertedOrders
      },
      {
        "$skip": offset
      },
      {
        "$limit": limit
      },
      ...selectProject
    ]).toArray();

    return { result, fields: [] }
  }

  async getTableKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    return [];
  }

  async getPrimaryKeys(_table: string, _schema?: string): Promise<PrimaryKeyColumn[]> {
    return [];
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

  async listTableIndexes(table: string, _schema?: string): Promise<TableIndex[]> {
    const collection = this.conn.db(this.database.database).collection(table);

    const indexes = await collection.indexes({ full: true });

    return indexes.map((index) => ({
      table,
      columns: Object.entries(index.key).map((key) => ({ name: key[0], order: key[1]})),
      name: index.name,
      unique: index.unique,
    } as TableIndex));
  }
}
