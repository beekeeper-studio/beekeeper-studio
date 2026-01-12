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
import { getTransformReply } from "@redis/client/dist/lib/commander";
import COMMANDS from "@redis/client/dist/lib/commands";
import type { Command } from "@redis/client/dist/lib/RESP/types";
import { IDbConnectionServer } from "../backendTypes";
import { IDbConnectionDatabase } from "../types";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import splitargs from "redis-splitargs";
import _ from "lodash";
import rawLog from "@bksLogger";
import { RedisChangeBuilder } from "@shared/lib/sql/change_builder/RedisChangeBuilder";
import fs from "fs/promises";
import REDIS_COMMAND_DOCS from "@beekeeperstudio/ui-kit/lib/components/text-editor/extensions/redisCommands.json";

type RedisQueryResult = BaseQueryResult;

type RedisSocketConfig = Parameters<typeof createClient>[0]["socket"];

const log = rawLog.scope("redis");

const NEWLINE_RG = /[\r\n]+/;

// Pre-compute normalized command lookup for O(1) access
const COMMANDS_NORMALIZED = Object.fromEntries(
  Object.entries(COMMANDS).map(([key, value]) => [
    key.toLowerCase().replace(/\s/g, ''),
    value
  ])
);

const redisContext: AppContextProvider = {
  getExecutionContext() {
    return null;
  },
  async logQuery() {
    return null;
  },
};

function has(haystack: string[], needle: string) {
  return haystack.some((item) =>
    item.toLowerCase().includes(needle.toLowerCase())
  );
}

function parseKnownRedisCommand(commandWithArgs: string[]) {
  const tokens = commandWithArgs.map(t => t.toLowerCase());

  while (tokens.length > 0) {
    const candidate = tokens.join(' ');

    if (candidate in REDIS_COMMAND_DOCS) {
      return {
        name: candidate as keyof typeof REDIS_COMMAND_DOCS,
        command: commandWithArgs.slice(0, tokens.length),
        args: commandWithArgs.slice(tokens.length),
      };
    }

    tokens.pop();
  }

  return null;
}

function getKnownRedisCommandDef(
  command: keyof typeof REDIS_COMMAND_DOCS,
  args: string[]
): Command | null {
  switch (command) {
    // Some commands have different response formats based on arguments
    case "zrange":
    case "zrevrange":
      return has(args, "withscores")
        ? COMMANDS.zRangeWithScores
        : COMMANDS.zRange;
    case "zrangebyscore":
    case "zrevrangebyscore":
      return has(args, "withscores")
        ? COMMANDS.zRangeByScoreWithScores
        : COMMANDS.zRangeByScore;
    // The rest should be handled here
    default: {
      const commandMerged = command.replaceAll(" ", "").toLowerCase();
      if (commandMerged in COMMANDS_NORMALIZED) {
        return COMMANDS_NORMALIZED[commandMerged];
      }
    }
  }

  log.warn("Known command definition not found:", command, args);
  return null;
}

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

function parseInfo(info: string) {
  return Object.fromEntries(
    info
      .split(NEWLINE_RG)
      .filter((line) => line.includes(":"))
      .map((line) => line.split(":"))
  );
}

function makeObjectResult(result: unknown, command: string) {
  const rows = Object.entries(result).map(([field, value]) => ({
    field,
    value,
  }));
  return {
    rows,
    fields: [
      { name: "field", id: "field" },
      { name: "value", id: "value" },
    ],
    rowCount: rows.length,
    affectedRows: 0,
    command,
  };
}

function makeArrayOfObjectsResult(result: unknown[], command: string) {
  return {
    rows: result,
    fields: result.length
      ? Object.keys(result[0]).map((key) => ({ name: key, id: key }))
      : [],
    rowCount: result.length,
    affectedRows: 0,
    command,
  };
}

function makeCursorResult(result: unknown, command: string) {
  const { cursor, ...rest } = result as Record<string, unknown>;
  const [data] = Object.values(rest);

  let rows: unknown[] = [{ cursor }];

  if (Array.isArray(data)) {
    if (data.length && _.isPlainObject(data[0])) {
      rows = data.map((d) => ({ cursor, ...d }));
    } else {
      rows = data.map((value) => ({ cursor, value }));
    }
  }

  return {
    rows,
    fields: [
      ...(Array.isArray(data) && data.length
        ? Object.keys(rows[0]).map((key) => ({ id: key, name: key }))
        : []),
    ],
    rowCount: 1,
    affectedRows: 0,
    command,
  };
}

function makeGenericResult(result: unknown, command: string) {
  return {
    rows: Array.isArray(result)
      ? result.map((r) => ({ result: r }))
      : [{ result }],
    fields: [{ id: "result", name: "result" }],
    rowCount: Array.isArray(result) ? result.length : 1,
    affectedRows: 0,
    command,
  };
}

export class RedisClient extends BasicDatabaseClient<RedisQueryResult> {
  redis: RedisClientType;
  respVersion: 2 | 3 = 2; // This is the default for most instances

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, redisContext, server, database);
    this.readOnlyMode = server?.config?.readOnlyMode;
  }

  private async getRespVersion() {
    try {
      const hello = await this.redis.hello();
      this.respVersion = hello.proto;
    } catch (error) {
      // Assume the default and dont change anything
      log.error("Error getting Redis version:", error);
    }
  }

  async connect(): Promise<void> {
    await super.connect();

    const socketConfig: RedisSocketConfig = {
      host: this.server.config.host || "localhost",
      port: this.server.config.port || 6379,
    };

    // Add SSL/TLS configuration if enabled
    if (this.server.config.ssl) {
      socketConfig.tls = true;

      // Set rejectUnauthorized based on sslRejectUnauthorized setting
      if (this.server.config.sslRejectUnauthorized !== undefined) {
        socketConfig.rejectUnauthorized =
          this.server.config.sslRejectUnauthorized;
      }

      // Add certificate files if provided
      if (this.server.config.sslCaFile) {
        socketConfig.ca = await fs.readFile(
          this.server.config.sslCaFile,
          "utf-8"
        );
      }

      if (this.server.config.sslCertFile) {
        socketConfig.cert = await fs.readFile(
          this.server.config.sslCertFile,
          "utf-8"
        );
      }

      if (this.server.config.sslKeyFile) {
        socketConfig.key = await fs.readFile(
          this.server.config.sslKeyFile,
          "utf-8"
        );
      }
    }

    this.redis = createClient({
      socket: socketConfig,
      username: this.server.config.user || undefined,
      password: this.server.config.password || "",
      database: parseInt(this.database.database, 10) || 0,
    });
    await this.redis.connect();

    await this.getRespVersion();
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
      filterTypes: ['standard']
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

  async getOutgoingKeys(): Promise<any[]> {
    return [];
  }

  async getIncomingKeys(): Promise<any[]> {
    return [];
  }

  async listTablePartitions(): Promise<any[]> {
    return [];
  }

  async executeCommand(text: string): Promise<NgQueryResult[]> {
    // Important to run before any command because previous command,
    // because it could have been "HEELO 3" which would change protocol version
    await this.getRespVersion();

    const lines = text
      .split(NEWLINE_RG)
      .map((c) => c.trim())
      .filter(Boolean);

    const results: NgQueryResult[] = [];

    for (const line of lines) {
      if (line.startsWith("#")) {
        continue; // this is a comment
      }

      const commandWithArgs = splitargs(line) as string[];
      const knownCommand = parseKnownRedisCommand(commandWithArgs);
      const knownCommandDef = knownCommand
        ? getKnownRedisCommandDef(knownCommand.name, knownCommand.args)
        : null;

      if (
        this.readOnlyMode &&
        knownCommandDef &&
        !knownCommandDef.IS_READ_ONLY
      ) {
        results.push(
          makeQueryError(
            knownCommand.name,
            `This command is not allowed in Read-Only mode.`
          )
        );
        continue;
      }

      try {
        const rawResult = await this.redis.sendCommand(commandWithArgs);
        const transform = knownCommandDef
          ? getTransformReply(knownCommandDef, this.respVersion)
          : null;
        const transformedResult = transform ? transform(rawResult) : rawResult;

        // Convert sets to arrays
        const result = JSON.parse(
          JSON.stringify(transformedResult, (_key, value) =>
            value instanceof Set ? [...value] : value
          )
        );

        if (knownCommand && ["info"].includes(knownCommand.name)) {
          results.push(makeObjectResult(parseInfo(result), line));
        } else if (
          knownCommand &&
          ["scan", "hscan", "sscan", "zscan"].includes(knownCommand.name)
        ) {
          results.push(makeCursorResult(result, line));
        } else if (_.isPlainObject(result)) {
          results.push(makeObjectResult(result, line));
        } else if (
          Array.isArray(result) &&
          result.length &&
          _.isPlainObject(result[0])
        ) {
          results.push(makeArrayOfObjectsResult(result, line));
        } else {
          results.push(makeGenericResult(result, line));
        }
      } catch (error) {
        results.push(makeQueryError(line, error));
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
    return _.mapValues(value, (v) => this.preparePrimitive(v)) as Record<
      string,
      string
    >;
  }

  private prepareZset(value: unknown): Array<{ value: string; score: number }> {
    if (typeof value === "string") value = JSON.parse(value);
    if (!Array.isArray(value)) throw new Error(`Value should be an array of {value, score} objects`);

    return value.map((entry) => {
      if (typeof entry !== 'object' || entry === null)
        throw new Error(`Each entry should be an object with value and score`);
      if (entry.value === undefined)
        throw new Error(`Missing value field`);
      if (entry.score === undefined)
        throw new Error(`Missing score field`);

      const score = Number(entry.score);
      if (Number.isNaN(score))
        throw new Error(`Invalid score: ${entry.score}`);

      return {
        value: this.preparePrimitive(entry.value),
        score,
      };
    });
  }

  private prepareStream(value: unknown) {
    if (typeof value === "string") value = JSON.parse(value);
    if (!Array.isArray(value)) throw new Error(`Value should be an array`);

    return value.map((entry) => {
      if (entry.id === undefined) throw new Error(`Missing id field`);
      if (entry.message === undefined) throw new Error(`Missing message field`);
      return {
        id: this.preparePrimitive(entry.id),
        message: this.prepareHash(entry.message),
      };
    });
  }

  /**
   * Infer the Redis type from the value structure
   */
  private inferTypeFromValue(value: unknown): RedisKeyType {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;

      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];

        // Try zset: array of objects with value and score
        if (first?.value !== undefined && first?.score !== undefined) {
          return "zset";
        }

        // Try stream: array of objects with id and message
        if (first?.id !== undefined && first?.message !== undefined) {
          return "stream";
        }

        // Otherwise it's a list
        return "list";
      }

      // Object → hash
      if (_.isObject(parsed) && !Array.isArray(parsed)) {
        return "hash";
      }

      // Default to string
      return "string";
    } catch {
      return "string";
    }
  }

  private async setRedisValue(
    key: string,
    type: RedisKeyType,
    value: unknown
  ): Promise<void> {
    switch (type) {
      case "string": {
        // Try to parse if it's a JSON string, otherwise use as-is
        let stringValue = value;
        if (typeof value === "string") {
          try {
            stringValue = JSON.parse(value);
          } catch {
            // Not valid JSON, use the raw string
            stringValue = value;
          }
        }
        await this.redis.set(key, this.preparePrimitive(stringValue));
        break;
      }
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
        const members = this.prepareZset(value);
        await this.redis.del(key);
        if (members.length > 0) {
          await this.redis.zAdd(key, members);
        }
        break;
      }
      case "stream": {
        const stream = this.prepareStream(value);
        await this.redis.del(key);
        for (const entry of stream) {
          // Use the original ID, or * for auto-generation if ID is malformed
          const entryId = entry.id && entry.id !== "" ? entry.id : "*";
          await this.redis.xAdd(key, entryId, entry.message);
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
        // Return as array of {value, score} objects to avoid ambiguity with hashes
        return await this.redis.zRangeWithScores(key, 0, -1);
      }
      case "hash":
        return this.redis.hGetAll(key);
      case "stream": {
        const result = await this.redis.xRange(key, "-", "+");
        return result.map((r) => ({ id: r.id, message: r.message }));
      }
      case "ReJSON-RL": {
        const result = await this.redis.json.get(key, { path: ["$"] });
        return result[0];
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
    log.log("Redis executeApplyChanges called with:", JSON.stringify(changes));

    // Handle deletions first
    for (const deleteOp of changes.deletes || []) {
      if (deleteOp.table === "keys") {
        const key = this.getOpKey(deleteOp);
        await this.redis.del(key);
      }
    }

    // Handle inserts (limited support - mainly for creating empty keys)
    // Process inserts before updates so keys exist when we try to update them
    for (const insertOp of changes.inserts || []) {
      if (insertOp.table === "keys") {
        const keyName = insertOp.data[0]?.key;
        if (keyName) {
          await this.redis.set(keyName, "");
        }
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
          let keyType = await this.redis.type(originalKey);

          // If key doesn't exist or is an empty string (from insert), infer type from value
          if (keyType === "none" || (keyType === "string" && (await this.redis.get(originalKey)) === "")) {
            keyType = this.inferTypeFromValue(newValue);
          }

          await this.setRedisValue(
            originalKey,
            keyType as RedisKeyType,
            newValue
          );
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
