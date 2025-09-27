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
import { createClient, RedisClientType } from "redis";
import { IDbConnectionServer } from "../backendTypes";
import { IDbConnectionDatabase } from "../types";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import splitargs from "redis-splitargs";
import _ from "lodash";
import rawLog from "@bksLogger";
import { RedisChangeBuilder } from "@shared/lib/sql/change_builder/RedisChangeBuilder";
import redisCommands from "@beekeeperstudio/ui-kit/components/text-editor/extensions/redisCommands";
// import fs from "fs/promises";

type RedisQueryResult = BaseQueryResult;

const log = rawLog.scope("redis");

const NEWLINE_RG = /[\r\n]+/;

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

type RedisScanOptions = {
  MATCH: string;
  COUNT: number;
  TYPE?: string;
};

type RedisTableRow = {
  key: string;
  type: RedisKeyType;
  ttl: number;
  memory: number;
  encoding: string;
  value: unknown;
};

function ensureArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

function objectFromPairs(pairs: unknown[]) {
  return Object.fromEntries(_.chunk(pairs, 2));
}

function parseInfo(info: string) {
  return Object.fromEntries(
    info
      .split(NEWLINE_RG)
      .filter((line) => line.includes(":"))
      .map((line) => line.split(":"))
  );
}

function makeMapResult(
  result: unknown,
  fieldName = "field",
  valueName = "value"
): NgQueryResult {
  const rows = Object.entries(result).map(([field, value]) => ({
    [fieldName]: field,
    [valueName]: value,
  }));
  return {
    rows,
    fields: [
      { name: fieldName, id: fieldName },
      { name: valueName, id: valueName },
    ],
    rowCount: rows.length,
    affectedRows: 0,
  };
}

function makePairsResult(
  result: unknown[],
  fieldName = "field",
  valueName = "value"
): NgQueryResult {
  return makeMapResult(objectFromPairs(result), fieldName, valueName);
}

function makeCursorResult(cursor: unknown, result: NgQueryResult) {
  if (result.rows?.length) {
    result.rows[0].cursor = cursor;
  } else {
    result.rows = [{ cursor }];
  }
  result.fields = [{ name: "cursor", id: "cursor" }, ...result.fields];
  return result;
}

function makeStreamResult(result: unknown) {
  const rows = [];
  for (const pair of ensureArray(result)) {
    const id = pair[0]; // typescript doesn't like array destructuring here for some reason
    const data = pair[1];
    for (const [field, value] of _.chunk(data, 2)) {
      rows.push({ id, field, value });
    }
  }
  return {
    rows,
    fields: [{ name: "id", id: "id" }, { name: "field", id: "field" }, { name: "value", id: "value" }],
    rowCount: rows.length,
    affectedRows: 0,
  };
}

function makeDefaultResult(
  result: unknown,
  valueName = "result"
): NgQueryResult {
  const rows = ensureArray(result).map((r) => ({ [valueName]: r }));
  return {
    rows,
    fields: [{ name: valueName, id: valueName }],
    rowCount: rows.length,
    affectedRows: 0,
  };
}

function makeQueryResult(
  command: keyof typeof redisCommands,
  args: string[],
  result: unknown
): NgQueryResult {
  command = command.toLowerCase() as keyof typeof redisCommands;
  args = args.map((arg) => arg.toLowerCase());

  if (_.isPlainObject(result)) {
    // RESP3 can return maps for some of the commands
    return makeMapResult(result);
  }

  if (Array.isArray(result)) {
    // RESP2 returns arrays for most of the commands with complex replies

    switch (command) {
      // These are exceptions
      // Normally, makeDefaultResult is enough for all other cases
      case "scan": {
        const [cursor, list] = result;
        return makeCursorResult(cursor, makeDefaultResult(list, "key"));
      }
      case "sscan": {
        const [cursor, list] = result;
        return makeCursorResult(cursor, makeDefaultResult(list, "value"));
      }
      case "hscan": {
        const [_key, _cursor, ...rest] = args;
        const [cursor, pairs] = result;
        return makeCursorResult(
          cursor,
          rest.includes("novalues")
            ? makeDefaultResult(pairs, "field")
            : makePairsResult(pairs)
        );
      }
      case "zscan": {
        const [cursor, pairs] = result;
        return makeCursorResult(
          cursor,
          makePairsResult(pairs, "value", "score")
        );
      }
      case "hgetall":
        return makePairsResult(result);
      case "xrange":
      case "xrevrange": {
        return makeStreamResult(result);
      }
      case "zrange":
      case "zrangebyscore": {
        const [_key, _start, _stop, ...rest] = args;
        return rest.includes("withscores")
          ? makePairsResult(result, "value", "score")
          : makeDefaultResult(result, "value");
      }
      default:
        return makeDefaultResult(result);
    }
  }

  switch (command) {
    case "info":
      return makeMapResult(parseInfo(result));
    default:
      return makeDefaultResult(result);
  }
}

export class RedisClient extends BasicDatabaseClient<RedisQueryResult> {
  redis: RedisClientType;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, redisContext, server, database);
  }

  async connect(): Promise<void> {
    await super.connect();

    this.redis = createClient({
      socket: {
        host: this.server.config.host || "localhost",
        port: this.server.config.port || 6379,
      },
      username: this.server.config.user || undefined,
      password: this.server.config.password || "",
      database: parseInt(this.database.database, 10) || 0,
    });
    await this.redis.connect();

    // Uncomment to get command list & docs upon connection as json
    // Used in autocomplete
    // ONLY DO THIS WHEN CONNECTING TO THE LATEST VERSION OF REDIS

    // const commands = await this.redis.commandList();
    // const docs = await Promise.all(
    //   commands.map((c) => this.redis.sendCommand(["COMMAND", "DOCS", c]))
    // );
    // const mapped = Object.fromEntries(
    //   docs
    //     .map((pair) => {
    //       const command = pair[0].replace("|", " ").toLowerCase();
    //       const docs = objectFromPairs(pair[1]);
    //       if (docs.history) docs.history = Object.fromEntries(docs.history);
    //       if (docs.arguments) {
    //         docs.arguments = docs.arguments.map(objectFromPairs);
    //         for (const arg of docs.arguments) {
    //           if (arg.arguments) {
    //             arg.arguments = arg.arguments.map(objectFromPairs);
    //             for (const arg2 of arg.arguments) {
    //               if (arg2.arguments) {
    //                 arg2.arguments = arg2.arguments.map(objectFromPairs);
    //               }
    //             }
    //           }
    //         }
    //       }

    //       return [command, docs];
    //     })
    //     .filter(([, docs]) => !docs.subcommands)
    //     .sort((a, b) => a[0].localeCompare(b[0]))
    // );

    // await fs.writeFile("commands.json", JSON.stringify(mapped, null, 2));
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
      this.redis.destroy();
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
    return parseInfo(info);
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

  async executeCommand(text: string): Promise<NgQueryResult[]> {
    const lines = text
      .split(NEWLINE_RG)
      .map((c) => c.trim())
      .filter(Boolean);

    const results: NgQueryResult[] = [];

    for (const line of lines) {
      if (line.startsWith("#")) {
        continue; // this is a comment
      }

      const [command, ...args] = splitargs(line);

      try {
        const result = await this.redis.sendCommand([command, ...args]);
        results.push(makeQueryResult(command, args, result));
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
      const config = await this.redis.configGet("databases");
      const dbCount = parseInt(config.databases, 10) || 16;
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
      const options: RedisScanOptions = { MATCH: match, COUNT: count };
      if (type) options.TYPE = type;

      const result = await this.redis.scan(cursor, options);
      keys.push(...result.keys);
      cursor = String(result.cursor);
    } while (cursor !== "0");
    return keys;
  }

  async getKeyInfo(key: string): Promise<RedisTableRow> {
    const type = (await this.redis.type(key)) as RedisKeyType;
    const memory = (await this.redis.memoryUsage(key)) as number;

    let encoding = "unknown";
    try {
      encoding = String(await this.redis.objectEncoding(key)); // make typescript happy by wrapping into string
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

  private prepareList(value: unknown): string[] {
    if (typeof value === "string") value = JSON.parse(value);
    if (!Array.isArray(value)) throw new Error(`Value should be an array`);
    return Object.values(value).map((v) => this.preparePrimitive(v));
  }

  private prepareHash(value: unknown): Record<string, string> {
    if (typeof value === "string") value = JSON.parse(value);
    if (!_.isObject(value) || Array.isArray(value))
      throw new Error(`Value should be an object`);
    return _.mapValues(value, (v) => this.preparePrimitive(v)) as Record<string, string>;
  }

  private prepareZset(value: unknown): Record<string, string> {
    const hash = this.prepareHash(value);
    for (const score of Object.values(hash)) {
      if (Number.isNaN(Number(score)))
        throw new Error(`Invalid score: ${score}`);
    }
    return hash as Record<string, string>;
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
          await this.redis.lPush(key, list.reverse()); // lpush adds in reverse order
        }
        break;
      }
      case "set": {
        // For sets, expect array directly
        const set = this.prepareList(value);
        await this.redis.del(key);
        if (set.length > 0) {
          await this.redis.sAdd(key, set);
        }
        break;
      }
      case "hash": {
        const hash = this.prepareHash(value);
        await this.redis.del(key);
        if (Object.keys(hash).length > 0) {
          for (const [field, value] of Object.entries(hash)) {
            await this.redis.hSet(key, field, value);
          }
        }
        break;
      }
      case "zset": {
        const zset = this.prepareZset(value);
        await this.redis.del(key);
        const members = Object.entries(zset).map(([value, score]) => ({
          score: Number(score),
          value,
        }));
        await this.redis.zAdd(key, members);
        break;
      }
      case "stream": {
        const stream = this.prepareStream(value);
        await this.redis.del(key);
        for (const entry of stream) {
          // Use the original ID, or * for auto-generation if ID is malformed
          const entryId = entry.id && entry.id !== "" ? entry.id : "*";
          await this.redis.xAdd(key, entryId, entry.data);
        }
        break;
      }
      case "ReJSON-RL": {
        // For JSON values, expect parsed object that needs to be stringified
        await this.redis.json.set(key, "$", this.preparePrimitive(value));
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
        return this.redis.lRange(key, 0, -1);
      case "set":
        return this.redis.sMembers(key);
      case "zset": {
        const result = await this.redis.zRangeWithScores(key, 0, -1);
        return Object.fromEntries(
          result.map(({ value, score }) => [value, score])
        );
      }
      case "hash":
        return this.redis.hGetAll(key);
      case "stream": {
        const result = await this.redis.xRange(key, "-", "+");
        return result.map((r) => ({ id: r.id, data: r.message }));
      }
      case "ReJSON-RL": {
        const result = await this.redis.json.get(key, { path: "$" });
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
    await this.redis.flushDb();
  }

  async getTableLength(): Promise<number> {
    return this.redis.dbSize();
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
}
