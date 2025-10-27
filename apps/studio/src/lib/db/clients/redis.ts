import {
  SupportedFeatures,
  TableOrView,
  TableResult,
  OrderBy,
  TableFilter,
  StreamResults,
  NgQueryResult,
  CancelableQuery,
  ExtendedTableColumn,
  TableChanges,
  TableUpdateResult,
  TableUpdate,
  TableDelete,
} from "../models";
import {
  AppContextProvider,
  BaseQueryResult,
  BasicDatabaseClient,
} from "./BasicDatabaseClient";
import Redis, { RedisOptions } from "ioredis";
import { IDbConnectionServer } from "../backendTypes";
import { IDbConnectionDatabase } from "../types";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import splitargs from "redis-splitargs";
import _ from "lodash";
import rawLog from "@bksLogger";
import { RedisChangeBuilder } from "@shared/lib/sql/change_builder/RedisChangeBuilder";

type RedisQueryResult = BaseQueryResult;

const log = rawLog.scope("redis");

const redisContext: AppContextProvider = {
  getExecutionContext() {
    return null;
  },
  async logQuery() {
    return null;
  },
};

function makeQueryError(command: string, error?: unknown): NgQueryResult {
  return {
    command: command,
    rows: [{ error: String(error) }],
    fields: [{ name: "error", id: "error" }],
    rowCount: 1,
    affectedRows: 0,
  };
}

type RedisKeyType =
  | "string"
  | "list"
  | "hash"
  | "set"
  | "zset"
  | "stream"
  | "ReJSON-RL";

type RedisTableRow = {
  key: string;
  type: RedisKeyType;
  ttl: number;
  memory: number;
  encoding: string;
  value: unknown;
};


const NEWLINE_RG = /[\r\n]+/;

export class RedisClient extends BasicDatabaseClient<RedisQueryResult> {
  redis: Redis;
  commands: Set<string>;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, redisContext, server, database);
  }

  async connect(): Promise<void> {
    await super.connect();

    const config: RedisOptions = {
      host: this.server.config.host || "localhost",
      port: this.server.config.port || 6379,
      username: this.server.config.user || undefined,
      password: this.server.config.password || "",
      db: parseInt(this.database.database, 10) || 0,
      lazyConnect: true, // needed to return promise
    };

    this.redis = new Redis(config);
    const connection = await this.redis.connect();

    const commands = await this.redis.command("LIST");
    this.commands = new Set<string>(commands as string[]);

    return connection
  }

  async versionString(): Promise<string> {
    const info = await this.getInfo();
    return info.redis_version || "Unknown";
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
      transactions: true,
    };
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      this.redis.quit();
      this.redis = null;
    }
  }

  async defaultSchema(): Promise<string | null> {
    return null;
  }

  async listCharsets(): Promise<string[]> {
    return ["utf8"];
  }

  async getDefaultCharset(): Promise<string> {
    return "utf8";
  }

  async listCollations(): Promise<string[]> {
    return [];
  }

  async listTables(): Promise<TableOrView[]> {
    return [{ name: "keys", entityType: "table", schema: null }];
  }

  async getInfo() {
    const info = await this.redis.info();
    return Object.fromEntries(
      info
        .split(NEWLINE_RG)
        .filter((line) => line.includes(":"))
        .map((line) => line.split(":"))
    );
  }

  async listViews(): Promise<TableOrView[]> {
    return [{ name: "info", entityType: "view", schema: null }];
  }

  async listRoutines(): Promise<any[]> {
    return [];
  }

  async listMaterializedViewColumns(): Promise<any[]> {
    return [];
  }

  async listTableColumns(table?: string): Promise<ExtendedTableColumn[]> {
    if (table === "keys") {
      return [
        {
          ordinalPosition: 0,
          schemaName: null,
          tableName: table,
          columnName: "key",
          dataType: "TEXT",
          bksField: { bksType: "UNKNOWN", name: "key" },
        },
        {
          ordinalPosition: 1,
          schemaName: null,
          tableName: table,
          columnName: "value",
          dataType: "json",
          bksField: { bksType: "UNKNOWN", name: "value" },
        },
        {
          ordinalPosition: 2,
          schemaName: null,
          tableName: table,
          columnName: "type",
          dataType: "TEXT",
          bksField: { bksType: "UNKNOWN", name: "type" },
          generated: true,
        },
        {
          ordinalPosition: 3,
          schemaName: null,
          tableName: table,
          columnName: "encoding",
          dataType: "TEXT",
          bksField: { bksType: "UNKNOWN", name: "encoding" },
          generated: true,
        },
        {
          ordinalPosition: 4,
          schemaName: null,
          tableName: table,
          columnName: "ttl",
          dataType: "INTEGER",
          bksField: { bksType: "UNKNOWN", name: "ttl" },
        },
        {
          ordinalPosition: 5,
          schemaName: null,
          tableName: table,
          columnName: "memory",
          dataType: "INTEGER",
          bksField: { bksType: "UNKNOWN", name: "memory" },
          generated: true,
        },
      ];
    }

    if (table === "info") {
      const info = await this.getInfo();
      return Object.keys(info).map((key, i) => ({
        ordinalPosition: i,
        schemaName: null,
        tableName: table,
        columnName: key,
        dataType: "TEXT",
        bksField: { bksType: "UNKNOWN", name: key },
      }));
    }

    throw new Error(`Trying to list columns for table ${table}`);
  }

  async listTableTriggers(): Promise<any[]> {
    return [];
  }

  async listTableIndexes(): Promise<any[]> {
    return [];
  }

  async listSchemas(): Promise<string[]> {
    return [];
  }

  async getTableReferences(): Promise<string[]> {
    return [];
  }

  async getTableKeys(): Promise<any[]> {
    return [];
  }

  async listTablePartitions(): Promise<any[]> {
    return [];
  }

  async executeCommand(commandText: string): Promise<NgQueryResult[]> {
    const commands = commandText
      .split(NEWLINE_RG)
      .map((c) => c.trim())
      .filter(Boolean);

    const results: NgQueryResult[] = [];

    for (const command of commands) {
      const [commandName, ...args] = splitargs(command);
      const lowerCommandName = commandName.toLowerCase();
      try {
        let result;
        if (this.commands.has(lowerCommandName) && typeof this.redis[lowerCommandName] === 'function') {
          result = await this.redis[lowerCommandName](...args);
        } else {
          result = await this.redis.call.call(this.redis, commandName, ...args);
        }
        results.push(this.makeQueryResult(command, result));
      } catch (error) {
        results.push(makeQueryError(command, error));
      }
    }

    return results;
  }

  async query(queryText: string): Promise<CancelableQuery> {
    return {
      execute: async () => this.executeCommand(queryText),
      cancel: async () => {
        // you can't cancel redis commands
      },
    };
  }

  async executeQuery(queryText: string): Promise<NgQueryResult[]> {
    return this.executeCommand(queryText);
  }

  async listDatabases() {
    try {
      // Get the actual database count from Redis configuration
      const config = await this.redis.config("GET", "databases");
      const dbCount = parseInt(config[1], 10) || 16;
      return new Array(dbCount).fill(null).map((_, i) => String(i));
    } catch (error) {
      // Fallback to default 16 databases if config command fails
      return new Array(16).fill(null).map((_, i) => String(i));
    }
  }

  async getTableProperties() {
    return null;
  }

  async getQuerySelectTop(_table: string, limit: number) {
    return `SCAN 0 MATCH * COUNT ${limit}`;
  }

  async listMaterializedViews(): Promise<TableOrView[]> {
    return [];
  }

  async getPrimaryKey(): Promise<string | null> {
    return null;
  }

  async getPrimaryKeys(table: string): Promise<any[]> {
    if (table === "keys") {
      // Use the key column itself as the primary key, but we'll allow editing it in cellEditCheck
      return [{ columnName: "key" }];
    }
    return [];
  }

  async scanAll(match = "*", count = 100, cursor = "0", type?: string) {
    log.debug("Scanning Redis keys", { match, count, cursor });
    const keys: string[] = [];
    do {
      const args = [cursor, "MATCH", match, "COUNT", count];
      if (type) args.push("TYPE", type);

      const [newCursor, result] = await this.redis.scan.call(this.redis, args);
      keys.push(...result);
      cursor = newCursor;
    } while (cursor !== "0");
    return keys;
  }

  async getKeyInfo(key: string): Promise<RedisTableRow> {
    const type = (await this.redis.type(key)) as RedisKeyType;
    const memory = (await this.redis.call("MEMORY", "USAGE", key)) as number;

    let encoding = "unknown";
    try {
      encoding = (await this.redis.call("OBJECT", "ENCODING", key)) as string;
    } catch (error) {
      // Some Redis versions or key types might not support OBJECT ENCODING
      log.debug(`Could not get encoding for key ${key}:`, error);
    }

    const value = await this.fetchRedisValue(key, type);

    return {
      key,
      value,
      type,
      encoding,
      ttl: await this.redis.ttl(key),
      memory,
    };
  }

  private preparePrimitive(value: unknown) {
    return typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : String(value);
  }

  private prepareList(value: unknown) {
    if (typeof value === "string") value = JSON.parse(value);
    if (!Array.isArray(value)) throw new Error(`Value should be an array`);
    return Object.values(value).map(this.preparePrimitive);
  }

  private prepareHash(value: unknown) {
    if (typeof value === "string") value = JSON.parse(value);
    if (!_.isObject(value) || Array.isArray(value))
      throw new Error(`Value should be an object`);
    return _.mapValues(value, this.preparePrimitive);
  }

  private prepareZset(value: unknown) {
    if (typeof value === "string") value = JSON.parse(value);
    if (!_.isObject(value) || Array.isArray(value))
      throw new Error(`Value should be an object`);
    const zset = _.mapValues(value, this.prepareList);
    for (const key of Object.keys(zset)) {
      if (Number.isNaN(Number(key))) throw new Error(`Invalid score: ${key}`);
    }
    return zset;
  }

  private prepareStream(value: unknown) {
    if (typeof value === "string") value = JSON.parse(value);
    if (!Array.isArray(value)) throw new Error(`Value should be an array`);

    return value.map((entry) => {
      if (entry.id === undefined) throw new Error(`Missing id field`);
      if (entry.data === undefined) throw new Error(`Missing data field`);
      return {
        id: this.preparePrimitive(entry.id),
        data: this.prepareHash(entry.data),
      };
    });
  }

  private async setRedisValue(
    key: string,
    type: RedisKeyType,
    value: unknown
  ): Promise<void> {
    switch (type) {
      case "string":
        await this.redis.set(key, this.preparePrimitive(value));
        break;
      case "list": {
        const list = this.prepareList(value);
        await this.redis.del(key);
        if (list.length > 0) {
          await this.redis.lpush(key, ...list.reverse()); // lpush adds in reverse order
        }
        break;
      }
      case "set": {
        // For sets, expect array directly
        const set = this.prepareList(value);
        await this.redis.del(key);
        if (set.length > 0) {
          await this.redis.sadd(key, ...set);
        }
        break;
      }
      case "hash": {
        const hash = this.prepareHash(value);
        await this.redis.del(key);
        if (Object.keys(hash).length > 0) {
          await this.redis.hmset(key, hash);
        }
        break;
      }
      case "zset": {
        const zset = this.prepareZset(value);
        await this.redis.del(key);
        for (const [score, members] of Object.entries(zset)) {
          for (const member of members) {
            await this.redis.zadd(key, Number(score), member);
          }
        }
        break;
      }
      case "stream": {
        const stream = this.prepareStream(value);
        await this.redis.del(key);
        for (const entry of stream) {
          const fields = [];
          for (const [field, fieldValue] of Object.entries(entry.data)) {
            fields.push(field, fieldValue);
          }
          if (fields.length > 0) {
            // Use the original ID, or * for auto-generation if ID is malformed
            const entryId = entry.id && entry.id !== "" ? entry.id : "*";
            await this.redis.xadd(key, entryId, ...fields);
          }
        }
        break;
      }
      case "ReJSON-RL": {
        // For JSON values, expect parsed object that needs to be stringified
        await this.redis.call(
          "JSON.SET",
          key,
          "$",
          this.preparePrimitive(value)
        );
        break;
      }
      default:
        throw new Error(`Cannot set value for unsupported Redis type: ${type}`);
    }
  }

  // Centralized Redis value fetching logic
  private async fetchRedisValue(key: string, type: string): Promise<unknown> {
    switch (type) {
      case "string":
        return this.redis.get(key);
      case "list":
        return this.redis.lrange(key, 0, -1);
      case "set":
        return this.redis.smembers(key);
      case "zset": {
        const result = await this.redis.zrange(key, 0, -1, "WITHSCORES");
        const pairs = _.chunk(result, 2).map(([member, score]) => ({
          member,
          score: Number(score),
        }));
        const grouped = _.groupBy(pairs, (item) => item.score);
        return _.mapValues(grouped, (group) =>
          group.map((item) => item.member).sort()
        );
      }
      case "hash":
        return this.redis.hgetall(key);
      case "stream": {
        const result = await this.redis.xrange(key, "-", "+");
        return result.map(([id, fields]) => {
          const data = {};
          // Redis returns fields as flat array: [field1, value1, field2, value2, ...]
          for (let i = 0; i < fields.length; i += 2) {
            data[fields[i]] = fields[i + 1];
          }
          return { id, data };
        });
      }
      case "ReJSON-RL": {
        const result = await this.redis.call("JSON.GET", key, "$");
        return JSON.parse(String(result));
      }
      default:
        throw new Error(`Unsupported Redis type: ${type}`);
    }
  }

  async selectTop(
    table: string,
    offset: number,
    limit: number,
    _orderBy?: OrderBy[], // TODO: how to disable ordering?
    filters?: string | TableFilter[]
  ): Promise<TableResult> {
    if (table === "info") {
      const info = await this.getInfo();
      return {
        result: [info],
        fields: Object.keys(info).map((key) => ({
          name: key,
          bksType: "UNKNOWN",
        })),
      };
    }

    let match = "";

    if (typeof filters === "string") {
      match = filters;
    } else if (Array.isArray(filters)) {
      const value = filters.find((f) => f.field === "key")?.value;

      if (value?.length) {
        match = Array.isArray(value) ? value[0] : value;
      }
    }

    match = match.trim();
    if (!match.endsWith("*")) match += "*";

    const keys = await this.scanAll(match);

    const result = await Promise.all(
      keys.slice(offset, offset + limit).map((key) => this.getKeyInfo(key))
    );

    return {
      result,
      fields: [
        { name: "key", bksType: "UNKNOWN" },
        { name: "value", bksType: "UNKNOWN" },
        { name: "type", bksType: "UNKNOWN" },
        { name: "encoding", bksType: "UNKNOWN" },
        { name: "ttl", bksType: "UNKNOWN" },
        { name: "memory", bksType: "UNKNOWN" },
      ],
    };
  }

  async selectTopSql(
    _table: string,
    _offset: number,
    limit: number
  ): Promise<string> {
    return `SCAN 0 MATCH * COUNT ${limit}`;
  }

  async selectTopStream(): Promise<StreamResults> {
    throw new Error("Not implemented");
  }

  async queryStream(): Promise<StreamResults> {
    throw new Error("Not implemented");
  }

  async rawExecuteQuery(_query: string): Promise<null> {
    log.error("Redis does not support querying");
    return null;
  }

  async truncateAllTables(): Promise<void> {
    await this.redis.flushdb();
  }

  async getTableLength(): Promise<number> {
    return this.redis.dbsize();
  }

  async duplicateTable(): Promise<void> {
    throw new Error("Not supported");
  }

  wrapIdentifier(value: string): string {
    return value;
  }

  async setTableDescription(): Promise<string> {
    throw new Error("Not supported");
  }

  async truncateElementSql(
    _elementName: string,
    _typeOfElement: any,
    _schema?: string
  ): Promise<string> {
    throw new Error("Not supported");
  }

  getBuilder(_table: string, _schema?: string): ChangeBuilderBase {
    return new RedisChangeBuilder(_table, _schema);
  }

  async duplicateTableSql(
    _tableName: string,
    _duplicateTableName: string,
    _schema?: string
  ): Promise<string> {
    throw new Error("Not supported");
  }

  async dropElement(): Promise<void> {
    throw new Error("Not supported");
  }

  parseTableColumn(): any {
    throw new Error("Not supported");
  }

  async setElementNameSql(
    _elementName: string,
    _newElementName: string,
    _typeOfElement: any,
    _schema?: string
  ): Promise<string> {
    throw new Error("Not supported");
  }

  async createDatabase(): Promise<string> {
    throw new Error("Not supported");
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error("Not supported");
  }

  async getTableCreateScript(): Promise<string> {
    throw new Error("Not supported");
  }

  async getViewCreateScript(): Promise<string[]> {
    throw new Error("Not supported");
  }

  async getMaterializedViewCreateScript(): Promise<string[]> {
    throw new Error("Not supported");
  }

  async getRoutineCreateScript(): Promise<string[]> {
    throw new Error("Not supported");
  }

  async createTable(): Promise<void> {
    throw new Error("Not supported");
  }

  async getCollectionValidation(): Promise<any> {
    return null;
  }

  async setCollectionValidation(): Promise<void> {
    throw new Error("Not supported");
  }

  async alterTableSql(): Promise<string> {
    throw new Error("Not supported");
  }

  async alterTable(): Promise<void> {
    throw new Error("Not supported");
  }

  async alterIndexSql(): Promise<string | null> {
    return null;
  }

  async alterIndex(): Promise<void> {
    throw new Error("Not supported");
  }

  async alterRelationSql(): Promise<string | null> {
    return null;
  }

  async alterRelation(): Promise<void> {
    throw new Error("Not supported");
  }

  async alterPartitionSql(): Promise<string | null> {
    return null;
  }

  async alterPartition(): Promise<void> {
    throw new Error("Not supported");
  }

  async applyChangesSql(): Promise<string> {
    throw new Error("Not supported");
  }

  private getOpKey(op: TableUpdate | TableDelete): string {
    return op.primaryKeys.find((pk) => pk.column === "key")!.value;
  }

  async executeApplyChanges(
    changes: TableChanges
  ): Promise<TableUpdateResult[]> {
    log.debug("Redis executeApplyChanges called with:", changes);

    // Handle deletions first
    for (const deleteOp of changes.deletes || []) {
      if (deleteOp.table === "keys") {
        const key = this.getOpKey(deleteOp);
        await this.redis.del(key);
      }
    }

    // Handle updates
    for (const updateOp of changes.updates || []) {
      if (updateOp.table === "keys") {
        const originalKey = this.getOpKey(updateOp);
        const column = updateOp.column;
        const newValue = updateOp.value;

        if (column === "key" && newValue && originalKey !== newValue) {
          await this.redis.rename(originalKey, newValue);
        } else if (column === "ttl" && originalKey) {
          const ttlValue = parseInt(newValue, 10);
          if (ttlValue === -1) {
            await this.redis.persist(originalKey);
          } else if (ttlValue > 0) {
            await this.redis.expire(originalKey, ttlValue);
          }
        } else if (column === "value" && originalKey) {
          // Handle value updates from Value Editor
          const keyType = await this.redis.type(originalKey);
          await this.setRedisValue(
            originalKey,
            keyType as RedisKeyType,
            newValue
          );
        }
      }
    }

    // Handle inserts (limited support - mainly for creating empty keys)
    for (const insertOp of changes.inserts || []) {
      if (insertOp.table === "keys") {
        const keyName = insertOp.data[0]?.key;
        if (keyName) {
          await this.redis.set(keyName, "");
        }
      }
    }

    return [];
  }

  async setElementName(): Promise<void> {
    throw new Error("Not supported");
  }

  async truncateElement(): Promise<void> {
    throw new Error("Not supported");
  }

  async getInsertQuery(): Promise<string> {
    throw new Error("Not supported");
  }

  async syncDatabase(): Promise<void> {
    return;
  }

  async importStepZero(): Promise<any> {
    return null;
  }

  async importBeginCommand(): Promise<any> {
    return null;
  }

  async importTruncateCommand(): Promise<any> {
    return null;
  }

  async importLineReadCommand(): Promise<any> {
    return null;
  }

  async importCommitCommand(): Promise<any> {
    return null;
  }

  async importRollbackCommand(): Promise<any> {
    return null;
  }

  async importFinalCommand(): Promise<any> {
    return null;
  }

  async getQueryForFilter(): Promise<string> {
    return "";
  }

  private makeQueryResult(command: string, result: unknown): NgQueryResult {
    let fields = [{ name: "result", id: "result" }];
    let rows: any = Array.isArray(result) ?
      result.map((r) => ({ result: r })) :
      [{ result }];
    if (_.isObject(result) && !_.isArray(result)) {
      fields = [{ name: "key", id: "key" }, { name: "value", id: "value" }];
      rows = Object.entries(result).map(([key, value]) => ({
        key,
        value
      }));
    }
    return {
      command: command,
      rows,
      fields,
      rowCount: Array.isArray(result) ? result.length : 1,
      affectedRows: 0,
    };
  }
}
