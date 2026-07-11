import { IDbConnectionServer } from '@/lib/db/backendTypes';
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from '@/lib/db/clients/BasicDatabaseClient';
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, CancelableQuery, NgQueryResult, DatabaseFilterOptions, TableProperties, PrimaryKeyColumn, TableChanges, OrderBy, TableFilter, TableResult, StreamResults, BksField } from '@/lib/db/models';
import { DatabaseElement, HanaAuthType, IDbConnectionDatabase } from '@/lib/db/types';
import { TableKey } from '@/shared/lib/dialects/models';
import { ChangeBuilderBase } from '@/shared/lib/sql/change_builder/ChangeBuilderBase';
import rawLog from '@bksLogger';
import knexlib from 'knex';
import { buildSchemaFilter } from '@/lib/db/clients/utils';
import { HanaData } from '@/shared/lib/dialects/hana';
import { HanaConn, HanaPool } from './hana/HanaPool';
import _ from 'lodash';
import { joinFilters } from '@/common/utils';
import { HanaChangeBuilder } from '@/shared/lib/sql/change_builder/HanaChangeBuilder';
import { HanaCursor } from './hana/HanaCursor';

const D = HanaData;
const log = rawLog.scope('sap-hana');
// only used as a query builder, never to execute anything. pg matches HANA's
// double-quoted identifiers and LIMIT/OFFSET syntax.
const knex = knexlib({ client: 'pg' });

// The largest LIMIT HANA accepts; OFFSET is only valid together with LIMIT.
const MAX_LIMIT = '4294967295';

// Filter operators accepted by buildFilterString (see TableFilterSymbols)
const ALLOWED_FILTER_TYPES = [
  '=', '!=', 'like', 'not like', '<', '<=', '>', '>=', 'in', 'is', 'is not'
];

// Coerces a value that ends up interpolated into LIMIT/OFFSET to a safe
// non-negative integer.
function safeCount(value: any): number {
  const num = Math.trunc(Number(value));
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Expected a non-negative number, got: ${value}`);
  }
  return num;
}

type HanaResult = {
  rows: Record<string, any>[];
  rowsAffected: number;
  columns: any[];
  arrayMode: boolean;
}

const hanaContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null;
  }
}

// System schemas hidden from listings. HANA tenants ship hundreds of
// _SYS_*/SYS objects that would drown out user schemas in the sidebar.
const SYSTEM_SCHEMA_FILTER = `SCHEMA_NAME NOT LIKE '\\_SYS\\_%' ESCAPE '\\' AND SCHEMA_NAME NOT IN ('SYS', 'SYSTEM')`;

export class HanaClient extends BasicDatabaseClient<HanaResult> {
  pool: HanaPool;
  dbConfig: any;
  version: string;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, hanaContext, server, database);
    this.dialect = 'generic';
    this.readOnlyMode = server?.config?.readOnlyMode || false;
  }

  async connect(): Promise<void> {
    await super.connect();

    this.dbConfig = this.configDatabase(this.server, this.database);
    this.pool = new HanaPool(this.dbConfig);

    // test connection and get version
    const conn = await this.pool.connect();
    try {
      const version = await conn.query(`SELECT VERSION AS "version" FROM SYS.M_DATABASE`);
      this.version = version?.[0]?.version;
    } finally {
      await conn.release();
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.disconnect();

    await super.disconnect();
  }

  private configDatabase(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    const options = server.config.hanaOptions ?? {};
    const config: any = {
      host: server.config.ssh ? server.config.localHost : server.config.host,
      port: server.config.ssh ? server.config.localPort : server.config.port,
    };

    // Only pass databaseName when the user explicitly set one -- it makes the
    // server redirect the client to the tenant's own SQL port, which fails
    // when that port isn't reachable (SSH tunnels, mapped docker ports).
    if (database.database) {
      config.databaseName = database.database;
    }

    switch (options.authMethod ?? HanaAuthType.Password) {
      case HanaAuthType.Jwt:
      case HanaAuthType.Saml:
        // the driver detects a JWT token or SAML assertion in pwd when uid is empty
        config.uid = '';
        config.pwd = options.token;
        break;
      case HanaAuthType.X509:
        config.authenticationX509 = options.x509CertPath;
        if (options.x509CertPassword) {
          config.authenticationX509Password = options.x509CertPassword;
        }
        break;
      default:
        config.uid = server.config.user;
        config.pwd = server.config.password;
    }

    // X.509 authentication requires an encrypted connection
    const encrypt = server.config.ssl || options.authMethod === HanaAuthType.X509;
    config.encrypt = encrypt ? 'true' : 'false';
    if (encrypt) {
      config.sslValidateCertificate = server.config.sslRejectUnauthorized ? 'true' : 'false';
      if (server.config.sslCaFile) {
        config.sslTrustStore = server.config.sslCaFile;
      }
      // client certificate for mutual TLS (the key file holds cert + key in PEM)
      const keyStore = server.config.sslKeyFile || server.config.sslCertFile;
      if (keyStore) {
        config.sslKeyStore = keyStore;
      }
    }

    return config;
  }

  getBuilder(table: string, schema?: string): ChangeBuilderBase {
    return new HanaChangeBuilder(table, schema);
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: false,
      comments: true,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
      transactions: false,
      filterTypes: ['standard']
    }
  }

  async versionString(): Promise<string> {
    return this.version;
  }

  async defaultSchema(): Promise<string | null> {
    const sql = `SELECT CURRENT_SCHEMA AS "schema" FROM DUMMY`;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows?.[0]?.schema ?? null;
  }

  async listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    const sql = `
      SELECT SCHEMA_NAME AS "schema"
      FROM SYS.SCHEMAS
      WHERE HAS_PRIVILEGES = 'TRUE'
        AND ${SYSTEM_SCHEMA_FILTER}
      ORDER BY SCHEMA_NAME
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map((row) => row.schema);
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    try {
      // only available on SYSTEMDB or to privileged users
      const { rows } = await this.driverExecuteSingle(`SELECT DATABASE_NAME AS "name" FROM SYS.M_DATABASES`);
      return rows.map((row) => row.name);
    } catch {
      const { rows } = await this.driverExecuteSingle(`SELECT DATABASE_NAME AS "name" FROM SYS.M_DATABASE`);
      return rows.map((row) => row.name);
    }
  }

  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = buildSchemaFilter(filter, 'SCHEMA_NAME');
    const sql = `
      SELECT
        SCHEMA_NAME AS "schema",
        TABLE_NAME AS "name"
      FROM SYS.TABLES
      WHERE ${schemaFilter ? schemaFilter : SYSTEM_SCHEMA_FILTER}
      ORDER BY SCHEMA_NAME, TABLE_NAME
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((item) => ({
      schema: item.schema,
      name: item.name,
      entityType: 'table'
    }));
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = buildSchemaFilter(filter, 'SCHEMA_NAME');
    const sql = `
      SELECT
        SCHEMA_NAME AS "schema",
        VIEW_NAME AS "name"
      FROM SYS.VIEWS
      WHERE ${schemaFilter ? schemaFilter : SYSTEM_SCHEMA_FILTER}
      ORDER BY SCHEMA_NAME, VIEW_NAME
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((item) => ({
      schema: item.schema,
      name: item.name,
      entityType: 'view'
    }));
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
  }

  async listMaterializedViewColumns(_table: string, _schema?: string): Promise<TableColumn[]> {
    return [];
  }

  async listTableColumns(table?: string, schema?: string): Promise<ExtendedTableColumn[]> {
    const tableClauses = [];
    const viewClauses = [];
    if (table) {
      tableClauses.push(`TABLE_NAME = ${D.escapeString(table, true)}`);
      viewClauses.push(`VIEW_NAME = ${D.escapeString(table, true)}`);
    }
    if (schema) {
      tableClauses.push(`SCHEMA_NAME = ${D.escapeString(schema, true)}`);
      viewClauses.push(`SCHEMA_NAME = ${D.escapeString(schema, true)}`);
    }
    const tableClause = tableClauses.length > 0 ? `WHERE ${tableClauses.join(' AND ')}` : '';
    const viewClause = viewClauses.length > 0 ? `WHERE ${viewClauses.join(' AND ')}` : '';
    // Length renders as TYPE(LENGTH[,SCALE]) for the types that take
    // parameters; DECIMAL without declared precision is a plain DECIMAL.
    const columnList = (tableColumn: string) => `
        SCHEMA_NAME AS "schema",
        ${tableColumn} AS "table",
        COLUMN_NAME AS "name",
        POSITION AS "position",
        DEFAULT_VALUE AS "default",
        IS_NULLABLE AS "nullable",
        GENERATION_TYPE AS "generated",
        CASE
          WHEN DATA_TYPE_NAME IN ('VARCHAR', 'NVARCHAR', 'ALPHANUM', 'SHORTTEXT', 'VARBINARY') AND LENGTH IS NOT NULL THEN
            DATA_TYPE_NAME || '(' || LENGTH || ')'
          WHEN DATA_TYPE_NAME = 'DECIMAL' AND LENGTH IS NOT NULL AND SCALE IS NOT NULL THEN
            DATA_TYPE_NAME || '(' || LENGTH || ',' || SCALE || ')'
          ELSE
            DATA_TYPE_NAME
        END AS "dataType"`;
    const sql = `
      SELECT * FROM (
        SELECT ${columnList('TABLE_NAME')}
        FROM SYS.TABLE_COLUMNS
        ${tableClause}
        UNION ALL
        SELECT ${columnList('VIEW_NAME')}
        FROM SYS.VIEW_COLUMNS
        ${viewClause}
      )
      ORDER BY "schema", "table", "position"
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((row) => ({
      schemaName: row.schema,
      tableName: row.table,
      columnName: row.name,
      dataType: row.dataType,
      ordinalPosition: Number(row.position),
      hasDefault: !_.isNil(row.default),
      nullable: row.nullable === 'TRUE',
      defaultValue: row.default,
      generated: !_.isNil(row.generated),
      bksField: this.parseTableColumn(row)
    }));
  }

  async listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]> {
    schema = schema || await this.defaultSchema();
    // HANA enforces foreign keys on column tables via internal triggers that
    // show up in SYS.TRIGGERS named "_SYS_TRIGGER_<oid>..."; filter them out
    // to list only user-defined triggers.
    const sql = `
      SELECT
        TRIGGER_NAME AS "name",
        TRIGGER_ACTION_TIME AS "timing",
        TRIGGER_EVENT AS "manipulation",
        SUBJECT_TABLE_NAME AS "table",
        SUBJECT_TABLE_SCHEMA AS "schema",
        DEFINITION AS "definition"
      FROM SYS.TRIGGERS
      WHERE SUBJECT_TABLE_NAME = ${D.escapeString(table, true)}
        AND SUBJECT_TABLE_SCHEMA = ${D.escapeString(schema, true)}
        AND TRIGGER_NAME NOT LIKE '\\_SYS\\_TRIGGER%' ESCAPE '\\'
      ORDER BY TRIGGER_NAME
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((row) => ({
      name: row.name,
      timing: row.timing,
      manipulation: row.manipulation,
      table: row.table,
      schema: row.schema,
      action: row.definition,
      condition: null
    }));
  }

  async listTableIndexes(table: string, schema?: string): Promise<TableIndex[]> {
    schema = schema || await this.defaultSchema();
    const sql = `
      SELECT
        i.INDEX_OID AS "id",
        i.INDEX_NAME AS "name",
        i.SCHEMA_NAME AS "schema",
        i.TABLE_NAME AS "table",
        i.CONSTRAINT AS "constraint",
        ic.COLUMN_NAME AS "columnName",
        ic.POSITION AS "position",
        ic.ASCENDING_ORDER AS "ascending"
      FROM SYS.INDEXES i
      JOIN SYS.INDEX_COLUMNS ic ON i.INDEX_OID = ic.INDEX_OID
      WHERE i.TABLE_NAME = ${D.escapeString(table, true)}
        AND i.SCHEMA_NAME = ${D.escapeString(schema, true)}
      ORDER BY i.INDEX_NAME, ic.POSITION
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    const grouped = _.groupBy(rows, 'name');

    return Object.keys(grouped).map((name, idx) => {
      const parts = _.sortBy(grouped[name], 'position');
      const first = parts[0];
      const constraint = first.constraint || '';
      return {
        id: first.id?.toString() ?? String(idx),
        name,
        schema: first.schema,
        table: first.table,
        primary: constraint.includes('PRIMARY KEY'),
        unique: constraint.includes('UNIQUE'),
        columns: parts.map((p) => ({
          name: p.columnName,
          order: p.ascending === 'TRUE' ? 'ASC' : 'DESC'
        }))
      };
    });
  }

  async listRoutines(filter?: FilterOptions): Promise<Routine[]> {
    const procSchemaFilter = buildSchemaFilter(filter, 'SCHEMA_NAME');
    const sql = `
      SELECT * FROM (
        SELECT
          PROCEDURE_OID AS "id",
          SCHEMA_NAME AS "schema",
          PROCEDURE_NAME AS "name",
          'procedure' AS "type"
        FROM SYS.PROCEDURES
        WHERE ${procSchemaFilter ? procSchemaFilter : SYSTEM_SCHEMA_FILTER}
        UNION ALL
        SELECT
          FUNCTION_OID AS "id",
          SCHEMA_NAME AS "schema",
          FUNCTION_NAME AS "name",
          'function' AS "type"
        FROM SYS.FUNCTIONS
        WHERE ${procSchemaFilter ? procSchemaFilter : SYSTEM_SCHEMA_FILTER}
      )
      ORDER BY "schema", "name"
    `;

    const paramsSQL = (paramTable: string, oidColumn: string, nameColumn: string) => `
      SELECT
        ${oidColumn} AS "routineId",
        PARAMETER_NAME AS "name",
        DATA_TYPE_NAME AS "dataType",
        LENGTH AS "length",
        POSITION AS "position",
        PARAMETER_TYPE AS "parameterType"
      FROM SYS.${paramTable}
      WHERE ${nameColumn} IS NOT NULL
      ORDER BY "routineId", POSITION
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    let params: Record<string, any>[] = [];
    try {
      const procParams = await this.driverExecuteSingle(paramsSQL('PROCEDURE_PARAMETERS', 'PROCEDURE_OID', 'PROCEDURE_NAME'));
      const funcParams = await this.driverExecuteSingle(paramsSQL('FUNCTION_PARAMETERS', 'FUNCTION_OID', 'FUNCTION_NAME'));
      params = [...procParams.rows, ...funcParams.rows];
    } catch (err) {
      log.warn('Could not load routine parameters', err);
    }
    const grouped = _.groupBy(params, 'routineId');

    return rows.map((row) => {
      const routineParams = grouped[row.id] || [];
      const returnParam = routineParams.find((p) => p.parameterType === 'RETURN');
      return {
        id: row.id?.toString(),
        schema: row.schema,
        name: row.name,
        type: row.type,
        returnType: returnParam?.dataType,
        entityType: 'routine' as const,
        routineParams: routineParams
          .filter((p) => p.parameterType !== 'RETURN')
          .map((p) => ({
            name: p.name,
            type: p.dataType,
            length: p.length || undefined
          }))
      };
    });
  }

  async getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
    log.debug('finding primary keys for', table, schema);

    schema = schema || await this.defaultSchema();
    const sql = `
      SELECT
        COLUMN_NAME AS "column",
        POSITION AS "position"
      FROM SYS.CONSTRAINTS
      WHERE TABLE_NAME = ${D.escapeString(table, true)}
        AND SCHEMA_NAME = ${D.escapeString(schema, true)}
        AND IS_PRIMARY_KEY = 'TRUE'
      ORDER BY POSITION
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((row) => ({
      columnName: row.column,
      position: Number(row.position)
    }));
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string> {
    const res = await this.getPrimaryKeys(table, schema);
    return res.length === 1 ? res[0].columnName : null;
  }

  async getTableReferences(table: string, schema?: string): Promise<string[]> {
    schema = schema || await this.defaultSchema();
    const sql = `
      SELECT DISTINCT REFERENCED_TABLE_NAME AS "table"
      FROM SYS.REFERENTIAL_CONSTRAINTS
      WHERE TABLE_NAME = ${D.escapeString(table, true)}
        AND SCHEMA_NAME = ${D.escapeString(schema, true)}
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map((row) => row.table);
  }

  async getOutgoingKeys(table: string, schema?: string): Promise<TableKey[]> {
    schema = schema || await this.defaultSchema();
    const sql = this.referentialConstraintsSql(
      `TABLE_NAME = ${D.escapeString(table, true)} AND SCHEMA_NAME = ${D.escapeString(schema, true)}`
    );

    const { rows } = await this.driverExecuteSingle(sql);
    const result = this.groupTableKeys(rows);
    log.debug("outgoing keys result", result);
    return result;
  }

  async getIncomingKeys(table: string, schema?: string): Promise<TableKey[]> {
    schema = schema || await this.defaultSchema();
    const sql = this.referentialConstraintsSql(
      `REFERENCED_TABLE_NAME = ${D.escapeString(table, true)} AND REFERENCED_SCHEMA_NAME = ${D.escapeString(schema, true)}`
    );

    const { rows } = await this.driverExecuteSingle(sql);
    const result = this.groupTableKeys(rows);
    log.debug("incoming keys result", result);
    return result;
  }

  private referentialConstraintsSql(whereClause: string): string {
    return `
      SELECT
        CONSTRAINT_NAME AS "name",
        REFERENCED_SCHEMA_NAME AS "toSchema",
        REFERENCED_TABLE_NAME AS "toTable",
        REFERENCED_COLUMN_NAME AS "toColumn",
        SCHEMA_NAME AS "fromSchema",
        TABLE_NAME AS "fromTable",
        COLUMN_NAME AS "fromColumn",
        UPDATE_RULE AS "onUpdate",
        DELETE_RULE AS "onDelete",
        POSITION AS "position"
      FROM SYS.REFERENTIAL_CONSTRAINTS
      WHERE ${whereClause}
      ORDER BY CONSTRAINT_NAME, POSITION
    `;
  }

  private groupTableKeys(rows: Record<string, any>[]): TableKey[] {
    const groupedKeys = _.groupBy(rows, 'name');

    return Object.keys(groupedKeys).map((constraintName) => {
      const keyParts = _.sortBy(groupedKeys[constraintName], 'position');

      if (keyParts.length === 1) {
        const row = keyParts[0];
        return {
          constraintName: row.name,
          toTable: row.toTable,
          toSchema: row.toSchema,
          toColumn: row.toColumn,
          fromTable: row.fromTable,
          fromSchema: row.fromSchema,
          fromColumn: row.fromColumn,
          onUpdate: row.onUpdate,
          onDelete: row.onDelete,
          isComposite: false,
        };
      }

      const first = keyParts[0];
      return {
        constraintName: first.name,
        toTable: first.toTable,
        toSchema: first.toSchema,
        toColumn: keyParts.map((p) => p.toColumn),
        fromTable: first.fromTable,
        fromSchema: first.fromSchema,
        fromColumn: keyParts.map((p) => p.fromColumn),
        onUpdate: first.onUpdate,
        onDelete: first.onDelete,
        isComposite: true,
      };
    });
  }

  async query(queryText: string, _tabId?: number, _options?: any): Promise<CancelableQuery> {
    const conn = await this.pool.connect();

    return {
      execute: async (): Promise<NgQueryResult[]> => {
        try {
          return await this.executeQuery(queryText, { connection: conn })
        } finally {
          await conn.release();
        }
      },
      cancel: async () => {
        if (!conn) {
          throw new Error('Query not ready to be canceled');
        }

        await this.pool.cancelConnection(conn);
      }
    }
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    const data = await this.driverExecuteMultiple(queryText, options);

    const commands = this.identifyCommands(queryText);

    return data.map((result, idx) => {
      const fields = result.rows && result.rows.length ? Object.keys(result.rows[0]).map((k) => ({
        name: k,
        id: k
      })) : undefined;

      const command = commands[idx]
      return {
        command: command?.type,
        text: command?.text,
        rows: result.rows,
        fields,
        rowCount: result.rows?.length || 0,
        affectedRows: result.rowsAffected
      }
    })
  }

  async getTableProperties(table: string, schema?: string): Promise<TableProperties> {
    schema = schema ?? await this.defaultSchema();
    const triggers = await this.listTableTriggers(table, schema);
    const indexes = await this.listTableIndexes(table, schema);
    const relations = await this.getTableKeys(table, schema);

    let size = 0;
    let description = null;

    try {
      const sizeResult = await this.driverExecuteSingle(`
        SELECT TABLE_SIZE AS "size"
        FROM SYS.M_TABLES
        WHERE TABLE_NAME = ${D.escapeString(table, true)}
          AND SCHEMA_NAME = ${D.escapeString(schema, true)}
      `);
      size = Number(sizeResult.rows?.[0]?.size) || 0;
    } catch (err) {
      log.error('Error getting table size', err);
    }

    try {
      const commentResult = await this.driverExecuteSingle(`
        SELECT COMMENTS AS "comments"
        FROM SYS.TABLES
        WHERE TABLE_NAME = ${D.escapeString(table, true)}
          AND SCHEMA_NAME = ${D.escapeString(schema, true)}
      `);
      description = commentResult.rows?.[0]?.comments || null;
    } catch (err) {
      log.error('Error getting table comment', err);
    }

    return {
      description,
      size,
      indexSize: 0,
      triggers,
      indexes,
      relations
    };
  }

  async getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string> {
    schema = schema ?? await this.defaultSchema();
    return `SELECT * FROM ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)} LIMIT ${safeCount(limit)}`;
  }

  async getTableLength(table: string, schema?: string): Promise<number> {
    const schemaString = schema ? `${this.wrapIdentifier(schema)}.` : '';
    const countQuery = `SELECT COUNT(*) AS "total" FROM ${schemaString}${this.wrapIdentifier(table)}`;

    const countResults = await this.driverExecuteSingle(countQuery);
    return Number(countResults.rows?.[0]?.total) || 0;
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    const columns = await this.listTableColumns(table, schema);
    const query = await this.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);

    const result = await this.driverExecuteSingle(query);
    const fields = columns.map((v) => v.bksField).filter((v) => selects && selects.length > 0 && !selects.includes('*') ? selects.includes(v.name) : true);
    const rows = await this.serializeQueryResult(result, fields);
    return { result: rows, fields };
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string> {
    const filterString = _.isString(filters) ? `WHERE ${filters}` : this.buildFilterString(filters);

    const orderByString = this.genOrderByString(orderBy);
    const schemaString = schema ? `${this.wrapIdentifier(schema)}.` : '';

    // HANA only accepts OFFSET together with LIMIT
    let limitOffsetString = '';
    if (_.isNumber(limit)) {
      limitOffsetString = `LIMIT ${safeCount(limit)}`;
      if (_.isNumber(offset)) limitOffsetString += ` OFFSET ${safeCount(offset)}`;
    } else if (_.isNumber(offset)) {
      limitOffsetString = `LIMIT ${MAX_LIMIT} OFFSET ${safeCount(offset)}`;
    }

    const selectsString = selects && selects.length > 0
      ? selects.map((s) => s === '*' ? '*' : this.wrapIdentifier(s)).join(', ')
      : '*';

    return `
      SELECT ${selectsString}
      FROM ${schemaString}${this.wrapIdentifier(table)}
      ${filterString}
      ${orderByString}
      ${limitOffsetString}
    `;
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    schema = schema ?? await this.defaultSchema();
    const columns = await this.listTableColumns(table, schema);
    const rowCount = await this.getTableLength(table, schema);

    const conn = await this.pool.connect();

    return {
      totalRows: Number(rowCount),
      columns,
      cursor: new HanaCursor(conn, {
        schema,
        table,
        orderBy,
        filters,
        chunkSize
      }, this)
    };
  }

  queryStream(_query: string, _chunkSize: number): Promise<StreamResults> {
    throw new Error('Method not implemented.');
  }

  async getTableCreateScript(table: string, schema?: string): Promise<string> {
    schema = schema ?? await this.defaultSchema();
    try {
      const result = await this.driverExecuteSingle(
        `CALL GET_OBJECT_DEFINITION(${D.escapeString(schema, true)}, ${D.escapeString(table, true)})`
      );
      const statement = result.rows?.[0]?.OBJECT_CREATION_STATEMENT;
      if (statement) {
        // the procedure returns the definition as a binary/CLOB-ish value
        return statement.toString();
      }
    } catch (err) {
      log.warn('GET_OBJECT_DEFINITION failed, assembling create script manually', err);
    }

    // fallback: assemble from the catalog
    const columns = await this.listTableColumns(table, schema);
    if (columns.length === 0) return '';
    const primaryKeys = await this.getPrimaryKeys(table, schema);

    const columnDefs = columns.map((c) => [
      `  ${this.wrapIdentifier(c.columnName)}`,
      c.dataType,
      c.hasDefault ? `DEFAULT ${c.defaultValue}` : null,
      c.nullable ? null : 'NOT NULL',
    ].filter((v) => !!v).join(' '));

    if (primaryKeys.length > 0) {
      const pkColumns = primaryKeys.map((pk) => this.wrapIdentifier(pk.columnName)).join(', ');
      columnDefs.push(`  PRIMARY KEY (${pkColumns})`);
    }

    return `CREATE COLUMN TABLE ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)} (\n${columnDefs.join(',\n')}\n);`;
  }

  async getViewCreateScript(view: string, schema?: string): Promise<string[]> {
    schema = schema ?? await this.defaultSchema();
    const sql = `
      SELECT DEFINITION AS "definition"
      FROM SYS.VIEWS
      WHERE VIEW_NAME = ${D.escapeString(view, true)}
        AND SCHEMA_NAME = ${D.escapeString(schema, true)}
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map((row) => row.definition).filter((d) => !!d);
  }

  async getRoutineCreateScript(routine: string, type: string, schema?: string): Promise<string[]> {
    schema = schema ?? await this.defaultSchema();
    const catalog = type === 'function'
      ? { table: 'SYS.FUNCTIONS', nameColumn: 'FUNCTION_NAME' }
      : { table: 'SYS.PROCEDURES', nameColumn: 'PROCEDURE_NAME' };
    const sql = `
      SELECT DEFINITION AS "definition"
      FROM ${catalog.table}
      WHERE ${catalog.nameColumn} = ${D.escapeString(routine, true)}
        AND SCHEMA_NAME = ${D.escapeString(schema, true)}
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map((row) => row.definition).filter((d) => !!d);
  }

  async listCharsets(): Promise<string[]> {
    return [];
  }

  async getDefaultCharset(): Promise<string> {
    return '';
  }

  async listCollations(_charset: string): Promise<string[]> {
    return [];
  }

  // Write operations are not supported in this version of the SAP HANA client.

  async createDatabase(_databaseName: string, _charset: string, _collation: string): Promise<string> {
    throw new Error('Creating databases is not supported for SAP HANA');
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error('Creating databases is not supported for SAP HANA');
  }

  async executeApplyChanges(_changes: TableChanges): Promise<any[]> {
    throw new Error('Table data editing is not supported for SAP HANA');
  }

  async setTableDescription(_table: string, _description: string, _schema?: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async setElementNameSql(_elementName: string, _newElementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    return '';
  }

  async dropElement(_elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<void> {
    throw new Error('Dropping elements is not supported for SAP HANA');
  }

  async truncateElementSql(_elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    return '';
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    throw new Error('Truncating tables is not supported for SAP HANA');
  }

  async duplicateTable(_tableName: string, _duplicateTableName: string, _schema?: string): Promise<void> {
    throw new Error('Duplicating tables is not supported for SAP HANA');
  }

  async duplicateTableSql(_tableName: string, _duplicateTableName: string, _schema?: string): Promise<string> {
    return '';
  }

  wrapIdentifier(value: string): string {
    return D.wrapIdentifier(value);
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<HanaResult | HanaResult[]> {
    const conn: HanaConn = options.connection ? options.connection : await this.pool.connect();
    const autoCommit = options.autoCommit ?? true;

    try {
      const queries = this.identifyCommands(q);
      const results: HanaResult[] = [];
      for (const query of queries) {
        log.info('EXECUTING QUERY: ', query.text);
        const result = await conn.query(query.text, autoCommit);

        if (_.isNil(result)) {
          // DDL statements produce no result
          results.push({ rows: [] } as HanaResult);
        } else if (typeof result === 'number') {
          results.push({ rowsAffected: result } as HanaResult);
        } else {
          results.push({ rows: result } as HanaResult);
        }
      }
      return results;
    } finally {
      if (!options.connection) {
        await conn.release();
      }
    }
  }

  async runWithConnection<T>(child: (c: HanaConn) => Promise<T>): Promise<T> {
    const connection = await this.pool.connect();
    try {
      return await child(connection)
    } finally {
      await connection.release();
    }
  }

  protected parseTableColumn(column: any): BksField {
    const dataType = (column.dataType || '').toUpperCase();
    return {
      name: column.name,
      bksType: dataType.includes('VARBINARY') || dataType.includes('BLOB') ? 'BINARY' : 'UNKNOWN',
    };
  }

  private genOrderByString(orderBy: OrderBy[]) {
    if (!orderBy || orderBy.length === 0) return "";

    return "ORDER BY " + (orderBy.map((item: { field: any, dir: any }) => {
      if (_.isObject(item)) {
        const dir = `${item.dir}`.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        return `${this.wrapIdentifier(item.field)} ${dir}`
      } else {
        return this.wrapIdentifier(item)
      }
    })).join(",");
  }

  private buildFilterString(filters: TableFilter[]) {
    let filterString = ""
    if (filters && filters.length > 0) {
      const allFilters = filters.map((item) => {
        const type = ALLOWED_FILTER_TYPES.find((t) => t === `${item.type}`.toLowerCase());
        if (!type) {
          throw new Error(`Unsupported filter type: ${item.type}`);
        }

        let wrappedValue = _.isArray(item.value) ?
          `(${item.value.map((v) => D.escapeString(v, true)).join(',')})` :
          D.escapeString(item.value, true)

        if (type.includes('is')) wrappedValue = 'NULL';

        return `${this.wrapIdentifier(item.field)} ${type.toUpperCase()} ${wrappedValue}`
      })
      filterString = "WHERE " + joinFilters(allFilters, filters)
    }
    return filterString
  }
}
