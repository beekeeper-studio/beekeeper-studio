import _ from 'lodash';
import rawLog from '@bksLogger';
import {
  DynamoDBClient as AWSDynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  ListTablesCommand,
  UpdateTableCommand,
  DescribeTimeToLiveCommand,
  TableDescription,
  AttributeDefinition,
  KeySchemaElement,
  GlobalSecondaryIndexDescription,
  LocalSecondaryIndexDescription,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  ExecuteStatementCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import { IDbConnectionServer } from '@/lib/db/backendTypes';
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from '@/lib/db/clients/BasicDatabaseClient';
import { DatabaseElement, IDbConnectionDatabase, IamAuthType } from '@/lib/db/types';
import {
  BksField,
  BksFieldType,
  CancelableQuery,
  ExtendedTableColumn,
  NgQueryResult,
  OrderBy,
  PrimaryKeyColumn,
  Routine,
  StreamResults,
  SupportedFeatures,
  TableChanges,
  TableColumn,
  TableDelete,
  TableFilter,
  TableIndex,
  TableInsert,
  TableOrView,
  TableProperties,
  TableResult,
  TableTrigger,
  TableUpdate,
  TableUpdateResult,
} from '@/lib/db/models';
import { CreateTableSpec, IndexAlterations, TableKey } from '@/shared/lib/dialects/models';
import { ChangeBuilderBase } from '@/shared/lib/sql/change_builder/ChangeBuilderBase';
import { DynamoDBChangeBuilder } from '@/shared/lib/sql/change_builder/DynamoDBChangeBuilder';
import { resolveAWSCredentials } from '@/lib/db/clients/utils';
import { createCancelablePromise } from '@/common/utils';
import { errors } from '@/lib/errors';
import { DynamoDBCursor } from './dynamodb/DynamoDBCursor';

const log = rawLog.scope('dynamodb');

interface DynamoQueryResult {
  columns: { name: string }[];
  rows: Record<string, any>[];
  arrayMode: boolean;
}

const dynamoContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_q: string, _opts: QueryLogOptions, _ctx: ExecutionContext): Promise<number | string> {
    return null;
  },
};

// Rough inference of a BksField type from a JS value pulled out of DynamoDB.
function inferTypeFromValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return 'BOOL';
  if (typeof value === 'number') return 'N';
  if (typeof value === 'string') return 'S';
  if (value instanceof Uint8Array || Buffer.isBuffer?.(value)) return 'B';
  if (Array.isArray(value)) return 'L';
  if (value instanceof Set) return 'SS';
  if (typeof value === 'object') return 'M';
  return 'UNKNOWN';
}

export class DynamoDBClient extends BasicDatabaseClient<DynamoQueryResult> {
  raw: AWSDynamoDBClient;
  doc: DynamoDBDocumentClient;
  region: string;
  endpoint: string | undefined;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, dynamoContext, server, database);
    this.readOnlyMode = server?.config?.readOnlyMode;
  }

  async applyChangesSql(_changes: TableChanges): Promise<string> {
    throw new Error('Copy to SQL is not supported for DynamoDB connections.');
  }

  async connect(): Promise<void> {
    await super.connect();

    const iam = this.server.config.iamAuthOptions || {};
    this.region = iam.awsRegion || 'us-east-1';
    this.endpoint = this.server.config.dynamoDbOptions?.endpoint || undefined;

    // When using AWS CLI auth type, the credential-providers chain handles profile
    // resolution automatically. For key auth we build an explicit credentials block.
    const clientConfig: ConstructorParameters<typeof AWSDynamoDBClient>[0] = {
      region: this.region,
    };
    if (this.endpoint) clientConfig.endpoint = this.endpoint;

    if (iam.authType === IamAuthType.Key) {
      if (!iam.accessKeyId || !iam.secretAccessKey) {
        throw new Error('DynamoDB IAM key authentication requires both Access Key ID and Secret Access Key.');
      }
      clientConfig.credentials = {
        accessKeyId: iam.accessKeyId,
        secretAccessKey: iam.secretAccessKey,
      };
    } else if (iam.authType === IamAuthType.File || iam.authType === IamAuthType.CLI) {
      clientConfig.credentials = await resolveAWSCredentials(iam);
    } else if (this.endpoint) {
      // Local endpoint without auth — DynamoDB Local accepts dummy credentials but
      // the SDK still requires something. Provide placeholders so connect() works.
      clientConfig.credentials = {
        accessKeyId: iam.accessKeyId || 'local',
        secretAccessKey: iam.secretAccessKey || 'local',
      };
    }

    this.raw = new AWSDynamoDBClient(clientConfig);
    this.doc = DynamoDBDocumentClient.from(this.raw, {
      marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
    });

    // ping — a ListTables call is the cheapest validation; empty result is fine.
    await this.raw.send(new ListTablesCommand({ Limit: 1 }));
  }

  async disconnect(): Promise<void> {
    if (this.doc) this.doc.destroy();
    this.raw = null;
    this.doc = null;
    await super.disconnect();
  }

  async versionString(): Promise<string> {
    return this.endpoint ? `DynamoDB Local (${this.endpoint})` : `Amazon DynamoDB (${this.region})`;
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
      filterTypes: ['standard'],
    };
  }

  async defaultSchema(): Promise<string | null> {
    return null;
  }

  async listCharsets(): Promise<string[]> {
    return [];
  }

  async getDefaultCharset(): Promise<string> {
    return null;
  }

  async listCollations(): Promise<string[]> {
    return [];
  }

  async listDatabases(): Promise<string[]> {
    return [this.region];
  }

  async listTables(): Promise<TableOrView[]> {
    const names: string[] = [];
    let ExclusiveStartTableName: string | undefined = undefined;
    do {
      const result = await this.raw.send(new ListTablesCommand({
        Limit: 100,
        ExclusiveStartTableName,
      }));
      names.push(...(result.TableNames || []));
      ExclusiveStartTableName = result.LastEvaluatedTableName;
    } while (ExclusiveStartTableName);

    return names.map((n) => ({ name: n, entityType: 'table', schema: null } as TableOrView));
  }

  async listViews(): Promise<TableOrView[]> {
    return [];
  }

  async listMaterializedViews(): Promise<TableOrView[]> {
    return [];
  }

  async listMaterializedViewColumns(): Promise<TableColumn[]> {
    return [];
  }

  async listRoutines(): Promise<Routine[]> {
    return [];
  }

  async listTableTriggers(): Promise<TableTrigger[]> {
    return [];
  }

  async listSchemas(): Promise<string[]> {
    return [];
  }

  async getTableReferences(): Promise<string[]> {
    return [];
  }

  async getOutgoingKeys(): Promise<TableKey[]> {
    return [];
  }

  async getIncomingKeys(): Promise<TableKey[]> {
    return [];
  }

  private async describeTable(table: string): Promise<TableDescription> {
    const result = await this.raw.send(new DescribeTableCommand({ TableName: table }));
    return result.Table;
  }

  async listTableColumns(table?: string): Promise<ExtendedTableColumn[]> {
    if (!table) {
      // Called without table → iterate. Most callers (TableList, etc.) pass a table,
      // so this branch is only hit from bulk schema loads.
      const tables = await this.listTables();
      const all: ExtendedTableColumn[] = [];
      for (const t of tables) {
        all.push(...(await this.listTableColumns(t.name)));
      }
      return all;
    }

    const desc = await this.describeTable(table);
    const keyNames = new Set((desc.KeySchema || []).map((k) => k.AttributeName));
    const declared: Map<string, string> = new Map(
      (desc.AttributeDefinitions || []).map((a) => [a.AttributeName, a.AttributeType])
    );

    // Sample items so we can surface non-key attributes too — DynamoDB only declares
    // types for indexed attributes, so the schema is otherwise implicit.
    const sample = await this.doc.send(new ScanCommand({
      TableName: table,
      Limit: 50,
      ConsistentRead: false,
    }));
    const discovered: Map<string, string> = new Map();
    (sample.Items || []).forEach((item) => {
      Object.entries(item).forEach(([k, v]) => {
        if (!discovered.has(k)) discovered.set(k, inferTypeFromValue(v));
      });
    });

    // Merge: declared attributes first (preserving order), then discovered.
    const names = new Set<string>();
    const ordered: string[] = [];
    for (const name of declared.keys()) {
      if (!names.has(name)) {
        names.add(name);
        ordered.push(name);
      }
    }
    for (const name of discovered.keys()) {
      if (!names.has(name)) {
        names.add(name);
        ordered.push(name);
      }
    }

    return ordered.map((name, idx) => ({
      ordinalPosition: idx,
      schemaName: null,
      tableName: table,
      columnName: name,
      dataType: declared.get(name) || discovered.get(name) || 'S',
      primaryKey: keyNames.has(name),
      hasDefault: false,
      nullable: !keyNames.has(name),
      bksField: { name, bksType: 'UNKNOWN' as BksFieldType },
    } as ExtendedTableColumn));
  }

  async listTableIndexes(table: string): Promise<TableIndex[]> {
    const desc = await this.describeTable(table);
    const result: TableIndex[] = [];

    const toColumns = (keys: KeySchemaElement[] | undefined) =>
      (keys || []).map((k) => ({
        name: k.AttributeName,
        order: k.KeyType === 'RANGE' ? ('ASC' as const) : ('ASC' as const),
      }));

    // The primary index on KeySchema.
    if (desc.KeySchema && desc.KeySchema.length) {
      result.push({
        id: 'primary',
        table,
        schema: null,
        name: 'PRIMARY',
        columns: toColumns(desc.KeySchema),
        unique: true,
        primary: true,
      });
    }

    (desc.GlobalSecondaryIndexes || []).forEach((gsi: GlobalSecondaryIndexDescription) => {
      result.push({
        id: gsi.IndexName,
        table,
        schema: null,
        name: gsi.IndexName,
        columns: toColumns(gsi.KeySchema),
        unique: false,
        primary: false,
      });
    });

    (desc.LocalSecondaryIndexes || []).forEach((lsi: LocalSecondaryIndexDescription) => {
      result.push({
        id: lsi.IndexName,
        table,
        schema: null,
        name: lsi.IndexName,
        columns: toColumns(lsi.KeySchema),
        unique: false,
        primary: false,
      });
    });

    return result;
  }

  async getTableProperties(table: string): Promise<TableProperties> {
    const desc = await this.describeTable(table);
    const indexes = await this.listTableIndexes(table);
    let ttl: string | undefined;
    try {
      const ttlDesc = await this.raw.send(new DescribeTimeToLiveCommand({ TableName: table }));
      const ttlStatus = ttlDesc.TimeToLiveDescription?.TimeToLiveStatus;
      if (ttlStatus && ttlStatus !== 'DISABLED') {
        ttl = `${ttlStatus} (${ttlDesc.TimeToLiveDescription?.AttributeName})`;
      }
    } catch {
      // TTL may not be readable on local DynamoDB — ignore.
    }

    return {
      description: [
        `Status: ${desc.TableStatus}`,
        `Item count: ${desc.ItemCount ?? 'unknown'}`,
        `Billing: ${desc.BillingModeSummary?.BillingMode || 'PROVISIONED'}`,
        ttl ? `TTL: ${ttl}` : null,
      ].filter(Boolean).join(' \u2022 '),
      size: desc.TableSizeBytes,
      indexes,
      relations: [],
      triggers: [],
      partitions: [],
    };
  }

  async getPrimaryKeys(table: string): Promise<PrimaryKeyColumn[]> {
    const desc = await this.describeTable(table);
    return (desc.KeySchema || []).map((k, i) => ({ columnName: k.AttributeName, position: i }));
  }

  async getPrimaryKey(table: string): Promise<string | null> {
    const desc = await this.describeTable(table);
    return desc.KeySchema?.find((k) => k.KeyType === 'HASH')?.AttributeName || null;
  }

  async getTableLength(table: string): Promise<number> {
    const desc = await this.describeTable(table);
    return desc.ItemCount || 0;
  }

  // Map a subset of the BKS TableFilter vocabulary to a DynamoDB FilterExpression.
  private buildFilter(filters: TableFilter[]) {
    if (!filters?.length) return { expr: undefined, names: undefined, values: undefined };
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};
    const parts: string[] = [];

    filters.forEach((f, idx) => {
      const nk = `#f${idx}`;
      names[nk] = f.field;
      const vk = `:v${idx}`;
      let clause: string | null = null;

      switch (f.type) {
        case '=':
          values[vk] = f.value;
          clause = `${nk} = ${vk}`;
          break;
        case '!=':
          values[vk] = f.value;
          clause = `${nk} <> ${vk}`;
          break;
        case '<':
        case '<=':
        case '>':
        case '>=':
          values[vk] = f.value;
          clause = `${nk} ${f.type} ${vk}`;
          break;
        case 'in': {
          const vals = Array.isArray(f.value) ? f.value : [f.value];
          const keys = vals.map((v, i) => {
            const k = `${vk}_${i}`;
            values[k] = v;
            return k;
          });
          clause = `${nk} IN (${keys.join(', ')})`;
          break;
        }
        case 'is':
          clause = `attribute_not_exists(${nk})`;
          break;
        case 'is not':
          clause = `attribute_exists(${nk})`;
          break;
        case 'like':
          values[vk] = String(f.value || '').replace(/%/g, '');
          clause = `contains(${nk}, ${vk})`;
          break;
        case 'not like':
          values[vk] = String(f.value || '').replace(/%/g, '');
          clause = `NOT contains(${nk}, ${vk})`;
          break;
        default:
          log.warn('DynamoDB: unsupported filter type', f.type);
      }

      if (clause) {
        const joiner = parts.length === 0 ? '' : ` ${(f.op || 'AND')} `;
        parts.push(`${joiner}${clause}`);
      }
    });

    if (!parts.length) return { expr: undefined, names: undefined, values: undefined };
    return {
      expr: parts.join(''),
      names,
      // Omit the values map if there are no placeholders — e.g. `attribute_exists`
      // filters — otherwise the SDK rejects the empty object.
      values: Object.keys(values).length ? values : undefined,
    };
  }

  async selectTop(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    _schema?: string,
    selects?: string[]
  ): Promise<TableResult> {
    const filterInput = Array.isArray(filters) ? filters : [];
    const { expr, names, values } = this.buildFilter(filterInput);

    // Build projection expression if specific columns were requested. Attribute
    // names have to round-trip through ExpressionAttributeNames to cover reserved
    // words (Name, Size, etc.).
    let projection: string | undefined;
    const projNames: Record<string, string> = names ? { ...names } : {};
    if (selects && selects.length && !selects.includes('*')) {
      const tokens = selects.map((s, i) => {
        const k = `#p${i}`;
        projNames[k] = s;
        return k;
      });
      projection = tokens.join(', ');
    }

    const items: any[] = [];
    let lastKey: Record<string, any> | undefined;
    const hasOrder = orderBy && orderBy.length > 0;
    const target = (offset || 0) + (limit || 0);
    // Scan page-by-page. DynamoDB has no SQL-style offset and no server-side
    // ORDER BY for Scan, so:
    //   - without orderBy: stop once we've buffered enough to satisfy offset+limit
    //   - with orderBy: we must scan the full result set so the in-memory sort
    //     produces a globally-correct slice
    do {
      const result = await this.doc.send(new ScanCommand({
        TableName: table,
        FilterExpression: expr,
        ExpressionAttributeNames: Object.keys(projNames).length ? projNames : undefined,
        ExpressionAttributeValues: values,
        ProjectionExpression: projection,
        ExclusiveStartKey: lastKey,
      }));
      items.push(...(result.Items || []));
      lastKey = result.LastEvaluatedKey;
      if (!hasOrder && target > 0 && items.length >= target) break;
    } while (lastKey);

    let rows = items;
    if (hasOrder) {
      rows = _.orderBy(
        rows,
        orderBy.map((o) => o.field),
        orderBy.map((o) => (o.dir.toLowerCase() === 'desc' ? 'desc' : 'asc')) as ('asc' | 'desc')[]
      );
    }
    rows = offset > 0
      ? rows.slice(offset, offset + (limit || rows.length))
      : rows.slice(0, limit || rows.length);

    const fields: BksField[] = rows.length
      ? Object.keys(rows[0]).map((k) => ({ name: k, bksType: 'UNKNOWN' as BksFieldType }))
      : [];

    return { result: rows, fields };
  }

  async selectTopSql(
    table: string,
    _offset: number,
    _limit: number,
    _orderBy: OrderBy[],
    _filters: string | TableFilter[],
    _schema?: string,
    selects?: string[]
  ): Promise<string> {
    // Render an approximate PartiQL statement for the query editor display.
    const cols = selects && selects.length && !selects.includes('*') ? selects.map((s) => `"${s}"`).join(', ') : '*';
    return `SELECT ${cols} FROM "${table}"`;
  }

  async selectTopStream(
    table: string,
    _orderBy: OrderBy[],
    filters: string | TableFilter[],
    chunkSize: number
  ): Promise<StreamResults> {
    const filterInput = Array.isArray(filters) ? filters : [];
    const { expr, names, values } = this.buildFilter(filterInput);
    const columns = await this.listTableColumns(table);
    const columnNames = columns.map((c) => c.columnName);

    const cursor = new DynamoDBCursor({
      kind: 'scan',
      client: this.doc,
      table,
      filterExpression: expr,
      expressionAttributeNames: names,
      expressionAttributeValues: values,
      chunkSize,
    }, columnNames);

    return {
      totalRows: await this.getTableLength(table),
      columns,
      cursor,
    };
  }

  async getQuerySelectTop(table: string, _limit: number): Promise<string> {
    return `SELECT * FROM "${table}"`;
  }

  private ensureWritable(): void {
    if (this.readOnlyMode) {
      throw new Error('Write action(s) not allowed in Read-Only Mode.');
    }
  }

  async executeQuery(queryText: string): Promise<NgQueryResult[]> {
    // Split on ';' that sit outside of single-quoted strings. PartiQL strings use
    // single quotes, so any ';' inside them should be preserved.
    const statements = splitPartiQL(queryText).filter((s) => s.trim().length > 0);
    const results: NgQueryResult[] = [];

    for (const raw of statements) {
      const statement = raw.trim();
      if (!statement) continue;
      if (this.readOnlyMode && isMutation(statement)) {
        throw new Error('Write action(s) not allowed in Read-Only Mode.');
      }
      try {
        const items: any[] = [];
        let nextToken: string | undefined;
        do {
          const result = await this.doc.send(new ExecuteStatementCommand({
            Statement: statement,
            NextToken: nextToken,
          }));
          items.push(...(result.Items || []));
          nextToken = result.NextToken;
        } while (nextToken);

        const fieldNames = items.length
          ? _.uniq(_.flatten(_.take(items, 20).map((r) => Object.keys(r))))
          : [];
        results.push({
          rows: items,
          rowCount: items.length,
          affectedRows: isMutation(statement) ? items.length : 0,
          fields: fieldNames.map((n) => ({ name: n, id: n })),
          command: firstWord(statement),
          text: statement,
        });
      } catch (err) {
        log.error('PartiQL execution error', err);
        throw err;
      }
    }

    return results;
  }

  async executeCommand(text: string): Promise<NgQueryResult[]> {
    return this.executeQuery(text);
  }

  async query(queryText: string): Promise<CancelableQuery> {
    const cancelable = createCancelablePromise(errors.CANCELED_BY_USER);
    let canceling = false;
    return {
      execute: async () => {
        try {
          return await Promise.race([cancelable.wait(), this.executeQuery(queryText)]);
        } catch (err: any) {
          if (canceling) {
            canceling = false;
            err.sqlectronError = 'CANCELED_BY_USER';
          }
          throw err;
        } finally {
          cancelable.discard();
        }
      },
      cancel: async () => {
        canceling = true;
        cancelable.cancel();
      },
    };
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    // Peek one row to discover columns FIRST
    const preview = await this.doc.send(new ExecuteStatementCommand({
      Statement: query,
      Limit: 1,
    }));
    const cols: TableColumn[] = (preview.Items && preview.Items[0])
      ? Object.keys(preview.Items[0]).map((k) => ({ columnName: k, dataType: 'S' }))
      : [];
    const columnNames = cols.map((c) => c.columnName);

    // Now create cursor with discovered columns
    const cursor = new DynamoDBCursor({
      kind: 'partiql',
      client: this.doc,
      statement: query,
      chunkSize,
    }, columnNames);

    return { totalRows: 0, columns: cols, cursor };
  }

  async executeApplyChanges(changes: TableChanges): Promise<TableUpdateResult[]> {
    if ((changes.inserts?.length || changes.updates?.length || changes.deletes?.length)) {
      this.ensureWritable();
    }
    const results: TableUpdateResult[] = [];
    try {
      if (changes.inserts?.length) await this.insertRows(changes.inserts);
      if (changes.updates?.length) results.push(...await this.updateValues(changes.updates));
      if (changes.deletes?.length) await this.deleteRows(changes.deletes);
    } catch (err: any) {
      log.error('DynamoDB apply changes failed', err);
      throw new Error(`Failed to apply changes: ${err.message}`);
    }
    return results;
  }

  async insertRows(inserts: TableInsert[]): Promise<void> {
    for (const ins of inserts) {
      if (!ins.table) throw new Error('Missing table name for insert');
      const rows = ins.data || [];
      // BatchWriteItem has a 25-item limit per request.
      for (const chunk of _.chunk(rows, 25)) {
        await this.doc.send(new BatchWriteCommand({
          RequestItems: {
            [ins.table]: chunk.map((row) => ({ PutRequest: { Item: row } })),
          },
        }));
      }
    }
  }

  async updateValues(updates: TableUpdate[]): Promise<TableUpdateResult[]> {
    const out: TableUpdateResult[] = [];
    for (const upd of updates) {
      if (!upd.table) throw new Error('Missing table name for update');
      if (!upd.primaryKeys?.length) throw new Error(`Missing primary keys for update in ${upd.table}`);
      const key: Record<string, any> = {};
      upd.primaryKeys.forEach((pk) => { key[pk.column] = pk.value; });

      const result = await this.doc.send(new UpdateCommand({
        TableName: upd.table,
        Key: key,
        UpdateExpression: 'SET #c = :v',
        ExpressionAttributeNames: { '#c': upd.column },
        ExpressionAttributeValues: { ':v': upd.value },
        ReturnValues: 'ALL_NEW',
      }));
      out.push(result.Attributes);
    }
    return out;
  }

  async deleteRows(deletes: TableDelete[]): Promise<void> {
    // Group deletes by table so we can use BatchWriteItem where possible.
    const byTable = _.groupBy(deletes, (d) => d.table);
    for (const [table, list] of Object.entries(byTable)) {
      for (const chunk of _.chunk(list, 25)) {
        await this.doc.send(new BatchWriteCommand({
          RequestItems: {
            [table]: chunk.map((del) => {
              const key: Record<string, any> = {};
              del.primaryKeys.forEach((pk) => { key[pk.column] = pk.value; });
              return { DeleteRequest: { Key: key } };
            }),
          },
        }));
      }
    }
  }

  async createTable(spec: CreateTableSpec): Promise<void> {
    this.ensureWritable();
    // Minimal create — a partition key named "id" of type S. Users needing richer
    // schemas should use the AWS console; we just make the "New Table" action work.
    await this.raw.send(new CreateTableCommand({
      TableName: spec.table,
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST',
    }));
  }

  async dropElement(elementName: string, typeOfElement: DatabaseElement): Promise<void> {
    this.ensureWritable();
    if (typeOfElement !== DatabaseElement.TABLE) {
      throw new Error(`DynamoDB does not support dropping ${typeOfElement}`);
    }
    await this.raw.send(new DeleteTableCommand({ TableName: elementName }));
  }

  async alterIndex(changes: IndexAlterations): Promise<void> {
    this.ensureWritable();
    const desc = await this.describeTable(changes.table);
    const existingAttrs = new Map<string, AttributeDefinition>(
      (desc.AttributeDefinitions || []).map((a) => [a.AttributeName, a])
    );
    const updates: any[] = [];

    for (const add of changes.additions || []) {
      if (!add.columns?.length) continue;
      const keySchema: KeySchemaElement[] = add.columns.map((c, i) => ({
        AttributeName: c.name,
        KeyType: i === 0 ? 'HASH' : 'RANGE',
      }));
      // Any referenced attribute must exist in AttributeDefinitions.
      for (const c of add.columns) {
        if (!existingAttrs.has(c.name)) {
          existingAttrs.set(c.name, { AttributeName: c.name, AttributeType: 'S' });
        }
      }
      updates.push({
        Create: {
          IndexName: add.name,
          KeySchema: keySchema,
          Projection: { ProjectionType: 'ALL' },
        },
      });
    }

    for (const drop of changes.drops || []) {
      updates.push({ Delete: { IndexName: drop.name } });
    }

    // Each UpdateTable call can only process one GSI change, so iterate.
    for (const update of updates) {
      await this.raw.send(new UpdateTableCommand({
        TableName: changes.table,
        AttributeDefinitions: Array.from(existingAttrs.values()),
        GlobalSecondaryIndexUpdates: [update],
      }));
    }
  }

  // -------------------- unsupported operations ---------------------
  getBuilder(table: string, schema?: string): ChangeBuilderBase {
    return new DynamoDBChangeBuilder(table, schema);
  }

  async createDatabase(): Promise<string> {
    throw new Error('DynamoDB does not support creating databases');
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error('DynamoDB does not support generating SQL');
  }

  async getTableCreateScript(): Promise<string> {
    throw new Error('DynamoDB does not expose CREATE TABLE SQL');
  }

  async getViewCreateScript(): Promise<string[]> {
    throw new Error('DynamoDB does not support views');
  }

  async getMaterializedViewCreateScript(): Promise<string[]> {
    throw new Error('DynamoDB does not support materialized views');
  }

  async getRoutineCreateScript(): Promise<string[]> {
    throw new Error('DynamoDB does not support routines');
  }

  async setElementName(): Promise<void> {
    throw new Error('DynamoDB does not support renaming tables');
  }

  async setElementNameSql(): Promise<string> {
    throw new Error('DynamoDB does not support renaming tables');
  }

  async setTableDescription(): Promise<string> {
    throw new Error('DynamoDB does not support table descriptions');
  }

  async truncateElement(): Promise<void> {
    throw new Error('DynamoDB does not support truncation — drop and recreate instead');
  }

  async truncateElementSql(): Promise<string> {
    throw new Error('DynamoDB does not support truncation');
  }

  async truncateAllTables(): Promise<void> {
    throw new Error('DynamoDB does not support truncation');
  }

  async duplicateTable(): Promise<void> {
    throw new Error('DynamoDB does not support duplicating tables');
  }

  async duplicateTableSql(): Promise<string> {
    throw new Error('DynamoDB does not support duplicating tables');
  }

  async getInsertQuery(): Promise<string> {
    throw new Error('DynamoDB does not support generating SQL');
  }

  wrapIdentifier(value: string): string {
    return `"${value}"`;
  }

  protected parseTableColumn(column: { field: string }): BksField {
    return { name: column.field, bksType: 'UNKNOWN' as BksFieldType };
  }

  protected async rawExecuteQuery(_q: string, _options: any): Promise<DynamoQueryResult | DynamoQueryResult[]> {
    // Not used — executeQuery goes through the PartiQL SDK directly.
    throw new Error('DynamoDB does not support rawExecuteQuery');
  }
}

// Split a PartiQL string on ';' boundaries but ignore semicolons inside single
// quotes. `sql-query-identifier` doesn't speak PartiQL, so we do it by hand.
function splitPartiQL(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "'" && text[i - 1] !== '\\') inQuote = !inQuote;
    if (c === ';' && !inQuote) {
      out.push(buf);
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function firstWord(s: string): string {
  return (s.trim().split(/\s+/, 1)[0] || '').toUpperCase();
}

function isMutation(s: string): boolean {
  const w = firstWord(s);
  return w === 'INSERT' || w === 'UPDATE' || w === 'DELETE';
}
