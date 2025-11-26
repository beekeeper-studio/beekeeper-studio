import { IDbConnectionServer } from '@/lib/db/backendTypes';
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from '@/lib/db/clients/BasicDatabaseClient';
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, CancelableQuery, NgQueryResult, DatabaseFilterOptions, TableProperties, PrimaryKeyColumn, TableChanges, OrderBy, TableFilter, TableResult, StreamResults, BksField, TableInsert, TableUpdate, TableDelete } from '@/lib/db/models';
import { DatabaseElement, IDbConnectionDatabase } from '@/lib/db/types';
import { TableKey } from '@/shared/lib/dialects/models';
import { ChangeBuilderBase } from '@/shared/lib/sql/change_builder/ChangeBuilderBase';
import rawLog from '@bksLogger';
import knexlib from 'knex';
import { identify } from 'sql-query-identifier';
import { buildDeleteQueries, buildInsertQuery, buildSchemaFilter, buildSelectQueriesFromUpdates, buildUpdateQueries } from '@/lib/db/clients/utils';
import { SqlAnywhereData } from '@/shared/lib/dialects/anywhere';
import { SqlAnywhereConn, SqlAnywherePool } from './anywhere/SqlAnywherePool';
import _ from 'lodash';
import { joinFilters } from '@/common/utils';
import { SqlAnywhereChangeBuilder } from '@/shared/lib/sql/change_builder/SqlAnywhereChangeBuilder';

const D = SqlAnywhereData;
const log = rawLog.scope('sql-anywhere');
// only using this for now
const knex = knexlib({ client: 'mssql' });

// TODO (@day): refactor this
type SQLAnywhereResult = {
  data: any[],
  // Number of changes made by the query
  rowsAffected: number
  rows: Record<string, any>[];
  columns: any[];
  arrayMode: boolean;
}

const anywhereContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null;
  }
}

export class SQLAnywhereClient extends BasicDatabaseClient<SQLAnywhereResult> {
  pool: SqlAnywherePool;
  dbConfig: any;
  version: any;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, anywhereContext, server, database);
    this.dialect = 'mssql';
    this.readOnlyMode = server?.config?.readOnlyMode || false;
  }

  async connect(): Promise<void> {
    await super.connect();

    this.dbConfig = this.configDatabase(this.server, this.database);
    this.pool = new SqlAnywherePool(this.dbConfig);

    // test connection and get version
    const conn = await this.pool.connect();
    const version = await conn.query(`SELECT PROPERTY('ProductVersion') AS version`)
    this.version = version[0];
    await conn.release();
  }

  async disconnect(): Promise<void> {
    await this.pool.disconnect();

    await super.disconnect();
  }

  private configDatabase(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    let config: any = {
      UserId: server.config.user,
      Password: server.config.password,
      DatabaseName: database.database,
    };

    if (server.config.sqlAnywhereOptions.serverName) {
      config = {
        ...config,
        ServerName: server.config.sqlAnywhereOptions.serverName
      };
    }

    if (server.config.sqlAnywhereOptions.mode === 'file') {
      config = {
        ...config,
        DatabaseFile: server.config.sqlAnywhereOptions.databaseFile,
        ForceStart: true,
      };
    } else {
      config = {
        ...config,
        Host: `${server.config.host}:${server.config.port}`
      };
    }

    return config;
  }

  getBuilder(table: string, schema?: string): ChangeBuilderBase {
    return new SqlAnywhereChangeBuilder(table, schema || 'dbo', []);
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: true,
      comments: true,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
      transactions: true,
      filterTypes: ['standard']
    }
  }

  async versionString(): Promise<string> {
    return this.version['version'];
  }

  async listTables(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = buildSchemaFilter(filter, 'table_schema');
    const sql = `
      SELECT
        t.table_name,
        u.user_name AS table_schema
      FROM SYS.SYSTABLE t
      JOIN SYS.SYSUSER u on t.creator = u.user_id
      WHERE t.table_type != 'VIEW' AND t.table_type != 'MAT VIEW'
      ${schemaFilter ? `AND ${schemaFilter}` : ''}
      ORDER BY table_schema, table_name;
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((item) => ({
      schema: item.table_schema,
      name: item.table_name,
      entityType: 'table'
    }));
  }

  async listViews(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = buildSchemaFilter(filter, 'table_schema');
    const sql = `
      SELECT
        t.table_name,
        u.user_name as table_schema
      FROM SYS.SYSTABLE t
      JOIN SYS.SYSUSER u ON t.creator = u.user_id
      WHERE t.table_type = 'VIEW'
      ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
      ORDER BY table_schema, table_name;
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((item) => ({
      schema: item.table_schema,
      name: item.table_name,
      entityType: 'view'
    }));
  }

  async listRoutines(filter?: FilterOptions): Promise<Routine[]> {
    const schemaFilter = buildSchemaFilter(filter, 'u.user_name');
    const sql = `
      SELECT 
        p.proc_id               AS id,
        u.user_name             AS routine_schema,
        p.proc_name             AS name,
        CASE 
          WHEN (
            SELECT TOP 1 d.domain_name
            FROM SYS.SYSPROCPARM pp
            LEFT JOIN SYS.SYSDOMAIN d ON pp.domain_id = d.domain_id
            WHERE pp.proc_id = p.proc_id
              AND pp.parm_name = p.proc_name
              AND pp.parm_mode_in = 'N'
              AND pp.parm_mode_out = 'Y'
          ) IS NOT NULL THEN 'FUNCTION'
          ELSE 'PROCEDURE'
        END                     AS routine_type,
        (
          SELECT TOP 1 d.domain_name
          FROM SYS.SYSPROCPARM pp
          LEFT JOIN SYS.SYSDOMAIN d ON pp.domain_id = d.domain_id
          WHERE pp.proc_id = p.proc_id
            AND pp.parm_name = p.proc_name
            AND pp.parm_mode_in = 'N'
            AND pp.parm_mode_out = 'Y'
        )                       AS data_type
      FROM SYS.SYSPROCEDURE p
      JOIN SYS.SYSUSER u     ON p.creator = u.user_id
      LEFT JOIN SYS.SYSOBJECT o ON p.object_id = o.object_id
      ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
      ORDER BY routine_schema, name;
    `;

    const paramsSQL = `
      SELECT
        u.user_name           AS routine_schema,
        p.proc_id             AS specific_name,
        prm.parm_name         AS parameter_name,
        prm.width             AS char_length,
        d.domain_name         AS data_type
      FROM SYS.SYSPROCEDURE p
      JOIN SYS.SYSUSER u          ON p.creator = u.user_id
      LEFT JOIN SYS.SYSPROCPARM prm ON p.proc_id = prm.proc_id
      LEFT JOIN SYS.SYSDOMAIN d ON prm.domain_id = d.domain_id
      WHERE prm.parm_mode_in = 'Y'
      ${schemaFilter ? `AND ${schemaFilter}` : ''}
      ORDER BY routine_schema, specific_name, prm.parm_id;
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    const paramsResult = await this.driverExecuteSingle(paramsSQL);
    const grouped = _.groupBy(paramsResult.rows, 'specific_name');
    
    return rows.map((row) => {
      const params = grouped[row.id] || [];
      return {
        schema: row.routine_schema,
        name: row.name,
        type: row.routine_type ? row.routine_type.toLowerCase() : 'function',
        returnType: row.data_type,
        id: row.id,
        entityType: 'routine',
        routineParams: params.map((p) => ({
          name: p.parameter_name,
          type: p.data_type,
          length: p.char_length || undefined
        }))
      }
    });
  }

  async listMaterializedViewColumns(table: string, schema?: string): Promise<TableColumn[]> {
    const sql = `
      SELECT
        u.user_name     AS view_schema,
        t.table_name    AS view_name,
        c.column_name   AS column_name,
        d.domain_name   AS data_type,
        c.width         AS width,
        c.scale         AS scale,
        c."nulls"       AS is_nullable
      FROM systable t
      JOIN sysuser u ON t.creator = u.user_id
      JOIN syscolumn c ON t.table_id = c.table_id
      LEFT JOIN sysdomain d ON c.domain_id = d.domain_id
      WHERE t.table_type = 'MAT VIEW'
        AND t.table_name = ${D.escapeString(table, true)}
        AND u.user_name = ${D.escapeString(schema, true)}
      ORDER BY c.column_id;
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map((row) => ({
      schemaName: row.view_schema,
      tableName: row.view_name,
      columnName: row.column_name,
      dataType: row.dataType
    }));
  }

  async listTableColumns(table?: string, schema?: string): Promise<ExtendedTableColumn[]> {
    const clauses = [];
    if (table) clauses.push(`t.table_name = ${D.escapeString(table, true)}`);
    if (schema) clauses.push(`u.user_name = ${D.escapeString(schema, true)}`);
    const clause = clauses.length > 0 ? `AND ${clauses.join(" AND ")}` : '';
    const sql = `
      SELECT 
        u.user_name         AS table_schema,
        t.table_name        AS table_name,
        c.column_name       AS column_name,
        c.column_id + 1     AS ordinal_position,
        c."default"         AS column_default,
        CASE 
          WHEN c.nulls = 'Y' THEN 'YES'
          ELSE 'NO'
        END                 AS is_nullable,
        'NO'                AS is_generated,
        CASE
          WHEN c.domain_id IN (SELECT domain_id FROM SYS.SYSDOMAIN WHERE domain_name IN ('char', 'varchar', 'binary', 'varbinary')) AND c.width IS NOT NULL THEN
            d.domain_name || '(' || c.width || ')'
          WHEN c.domain_id IN (SELECT domain_id FROM SYS.SYSDOMAIN WHERE domain_name IN ('numeric', 'decimal')) AND c.width IS NOT NULL AND c.scale IS NOT NULL THEN
            d.domain_name || '(' || c.width || ',' || c.scale || ')'
          ELSE
            d.domain_name
        END                 AS data_type
      FROM SYS.SYSCOLUMN c
      JOIN SYS.SYSTABLE t ON c.table_id = t.table_id
      JOIN SYS.SYSUSER u ON t.creator = u.user_id
      JOIN SYS.SYSDOMAIN d ON c.domain_id = d.domain_id
      WHERE t.table_type != 'MAT VIEW'
      ${clause}
      ORDER BY table_schema, table_name, ordinal_position;
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((row) => ({
      schemaName: row.table_schema,
      tableName: row.table_name,
      columnName: row.column_name,
      dataType: row.data_type,
      ordinalPosition: Number(row.ordinal_position),
      hasDefault: !_.isNil(row.column_default),
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      generated: row.is_generated === 'YES',
      bksField: this.parseTableColumn(row)
    }));
  }

  async listTableTriggers(table: string, schema?: string): Promise<TableTrigger[]> {
    schema = schema || await this.defaultSchema();
    const sql = `
      SELECT 
        COALESCE(tr.trigger_name, 'Trigger_' || tr.trigger_id) AS name,
        tr.event AS event,
        tr.trigger_time AS timing,
        tr.trigger_defn AS definition,
        t.table_name,
        u.user_name AS schema_name
      FROM SYSTRIGGER tr
      JOIN SYSTABLE t ON tr.table_id = t.table_id
      JOIN SYSUSER u ON t.creator = u.user_id
      WHERE t.table_name = ${D.escapeString(table, true)}
      AND u.user_name = ${D.escapeString(schema, true)}
      ORDER BY tr.trigger_id
    `;
    
    const { rows } = await this.driverExecuteSingle(sql);
    
    if (!rows || rows.length === 0) return [];
    
    return rows.map(row => {
      // Determine the manipulation type (INSERT, UPDATE, DELETE, UPDATE OF columns) from the event
      let manipulation = '';
      switch(row.event) {
        case 'I': manipulation = 'INSERT'; break;
        case 'U': manipulation = 'UPDATE'; break;
        case 'D': manipulation = 'DELETE'; break;
        case 'C': manipulation = 'UPDATE OF COLUMNS'; break;
        default: manipulation = row.event || ''; 
      }
      
      // Determine the timing (BEFORE, AFTER, INSTEAD OF)
      let timing = 'BEFORE';
      switch(row.timing) {
        case 'A': timing = 'AFTER'; break;
        case 'B': timing = 'BEFORE'; break;
        case 'I': timing = 'INSTEAD OF'; break;
        default: timing = 'BEFORE';
      }
      
      return {
        name: row.name,
        timing: timing,
        manipulation: manipulation,
        table: row.table_name,
        schema: row.schema_name,
        action: row.definition,
        condition: null
      };
    });
  }
  
  async listTableIndexes(table: string, schema?: string): Promise<TableIndex[]> {
    schema = schema || await this.defaultSchema();
    const sql = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY iname) AS id,
        iname AS name,
        icreator AS schema_name,
        tname AS table_name,
        CASE 
          WHEN indextype = 'Primary Key' THEN 'Y'
          ELSE 'N'
        END AS is_primary,
        CASE 
          WHEN indextype LIKE '%Unique%' THEN 'Y'
          ELSE 'N'
        END AS is_unique,
        colnames
      FROM SYS.SYSINDEXES
      WHERE tname = ${D.escapeString(table, true)}
      AND icreator = ${D.escapeString(schema, true)}
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    
    if (!rows || rows.length === 0) return [];
    
    return rows.map(row => {
      // Parse the column information from colnames string
      // The format is typically "column1 ASC, column2 DESC, ..."
      const columnParts = row.colnames.split(',').map(part => part.trim());
      const columns = columnParts.map(part => {
        const [columnName, orderType] = part.split(/\s+/);
        return {
          name: columnName,
          order: orderType || 'ASC'
        };
      });
      
      return {
        id: row.id,
        name: row.name,
        schema: row.schema_name,
        table: row.table_name,
        primary: row.is_primary === 'Y',
        unique: row.is_unique === 'Y',
        columns: columns
      };
    });
  }

  async listSchemas(filter?: SchemaFilterOptions): Promise<string[]> {
    const sql = `
      SELECT 
        user_name AS schema_name
      FROM SYSUSER
      WHERE user_name NOT IN ('SYS', 'rs_systabgroup')
      ORDER BY user_name
    `;
    
    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map(row => row.schema_name);
  }

  async getTableReferences(table: string, schema?: string): Promise<string[]> {
    schema = schema || await this.defaultSchema();
    const sql = `
      SELECT DISTINCT
        t_pri.table_name AS referenced_table
      FROM SYSFKEY fk
      JOIN SYSTABLE t_for ON fk.foreign_table_id = t_for.table_id
      JOIN SYSUSER u_for ON t_for.creator = u_for.user_id
      JOIN SYSTABLE t_pri ON fk.primary_table_id = t_pri.table_id
      JOIN SYSUSER u_pri ON t_pri.creator = u_pri.user_id
      WHERE t_for.table_name = ${D.escapeString(table, true)}
      AND u_for.user_name = ${D.escapeString(schema, true)}
    `;
    
    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map(row => row.referenced_table);
  }

  async getOutgoingKeys(table: string, schema?: string): Promise<TableKey[]> {
    schema = schema || 'dbo';

    // Query for foreign keys FROM this table (outgoing - referencing other tables)
    const sql = `
      SELECT
        CAST(fk.foreign_table_id AS VARCHAR) + '_' + CAST(fk.primary_table_id AS VARCHAR) AS name,
        u_pri.user_name AS to_schema,
        t_pri.table_name AS to_table,
        c_pri.column_name AS to_column,
        u_for.user_name AS from_schema,
        t_for.table_name AS from_table,
        c_for.column_name AS from_column,
        CAST(fk.foreign_table_id AS VARCHAR) + '_' + CAST(fk.primary_table_id AS VARCHAR) AS constraint_name,
        'NO ACTION' AS on_update,
        'NO ACTION' AS on_delete,
        ic_for.sequence AS sequence
      FROM SYS.SYSFKEY fk
      JOIN SYS.SYSIDXCOL ic_for ON fk.foreign_index_id = ic_for.index_id AND ic_for.table_id = fk.foreign_table_id
      JOIN SYS.SYSCOLUMN c_for ON ic_for.table_id = c_for.table_id AND ic_for.column_id = c_for.column_id
      JOIN SYS.SYSTABLE t_for ON fk.foreign_table_id = t_for.table_id
      JOIN SYS.SYSUSER u_for ON t_for.creator = u_for.user_id
      JOIN SYS.SYSIDXCOL ic_pri ON fk.primary_index_id = ic_pri.index_id AND ic_pri.table_id = fk.primary_table_id
      JOIN SYS.SYSCOLUMN c_pri ON ic_pri.table_id = c_pri.table_id AND ic_pri.column_id = c_pri.column_id
      JOIN SYS.SYSTABLE t_pri ON fk.primary_table_id = t_pri.table_id
      JOIN SYS.SYSUSER u_pri ON t_pri.creator = u_pri.user_id
      WHERE t_for.table_name = ${D.escapeString(table, true)}
      AND u_for.user_name = ${D.escapeString(schema, true)}
      AND ic_for.sequence = ic_pri.sequence
      ORDER BY name, sequence
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    // Group by constraint name to identify composite keys
    const groupedKeys = _.groupBy(rows, 'name');

    const result = Object.keys(groupedKeys).map(constraintName => {
      const keyParts = groupedKeys[constraintName];

      // Sort key parts by sequence to ensure correct column order
      const sortedKeyParts = _.sortBy(keyParts, 'sequence');

      // If there's only one part, return a simple key (backward compatibility)
      if (sortedKeyParts.length === 1) {
        const row = sortedKeyParts[0];
        return {
          constraintName: row.name,
          toTable: row.to_table,
          toSchema: row.to_schema,
          toColumn: row.to_column,
          fromTable: row.from_table,
          fromSchema: row.from_schema,
          fromColumn: row.from_column,
          onUpdate: row.on_update,
          onDelete: row.on_delete,
          isComposite: false,
        };
      }

      // If there are multiple parts, it's a composite key
      const firstPart = sortedKeyParts[0];
      return {
        constraintName: firstPart.name,
        toTable: firstPart.to_table,
        toSchema: firstPart.to_schema,
        toColumn: sortedKeyParts.map(p => p.to_column),
        fromTable: firstPart.from_table,
        fromSchema: firstPart.from_schema,
        fromColumn: sortedKeyParts.map(p => p.from_column),
        onUpdate: firstPart.on_update,
        onDelete: firstPart.on_delete,
        isComposite: true,
      };
    });

    log.debug("outgoing keys result", result);
    return result;
  }

  async getIncomingKeys(table: string, schema?: string): Promise<TableKey[]> {
    schema = schema || 'dbo';

    // Query for foreign keys TO this table (incoming - other tables referencing this table)
    const sql = `
      SELECT
        CAST(fk.foreign_table_id AS VARCHAR) + '_' + CAST(fk.primary_table_id AS VARCHAR) AS name,
        u_pri.user_name AS to_schema,
        t_pri.table_name AS to_table,
        c_pri.column_name AS to_column,
        u_for.user_name AS from_schema,
        t_for.table_name AS from_table,
        c_for.column_name AS from_column,
        CAST(fk.foreign_table_id AS VARCHAR) + '_' + CAST(fk.primary_table_id AS VARCHAR) AS constraint_name,
        'NO ACTION' AS on_update,
        'NO ACTION' AS on_delete,
        ic_for.sequence AS sequence
      FROM SYS.SYSFKEY fk
      JOIN SYS.SYSIDXCOL ic_for ON fk.foreign_index_id = ic_for.index_id AND ic_for.table_id = fk.foreign_table_id
      JOIN SYS.SYSCOLUMN c_for ON ic_for.table_id = c_for.table_id AND ic_for.column_id = c_for.column_id
      JOIN SYS.SYSTABLE t_for ON fk.foreign_table_id = t_for.table_id
      JOIN SYS.SYSUSER u_for ON t_for.creator = u_for.user_id
      JOIN SYS.SYSIDXCOL ic_pri ON fk.primary_index_id = ic_pri.index_id AND ic_pri.table_id = fk.primary_table_id
      JOIN SYS.SYSCOLUMN c_pri ON ic_pri.table_id = c_pri.table_id AND ic_pri.column_id = c_pri.column_id
      JOIN SYS.SYSTABLE t_pri ON fk.primary_table_id = t_pri.table_id
      JOIN SYS.SYSUSER u_pri ON t_pri.creator = u_pri.user_id
      WHERE t_pri.table_name = ${D.escapeString(table, true)}
      AND u_pri.user_name = ${D.escapeString(schema, true)}
      AND ic_for.sequence = ic_pri.sequence
      ORDER BY name, sequence
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    // Group by constraint name to identify composite keys
    const groupedKeys = _.groupBy(rows, 'name');

    const result = Object.keys(groupedKeys).map(constraintName => {
      const keyParts = groupedKeys[constraintName];

      // Sort key parts by sequence to ensure correct column order
      const sortedKeyParts = _.sortBy(keyParts, 'sequence');

      // If there's only one part, return a simple key (backward compatibility)
      if (sortedKeyParts.length === 1) {
        const row = sortedKeyParts[0];
        return {
          constraintName: row.name,
          toTable: row.to_table,
          toSchema: row.to_schema,
          toColumn: row.to_column,
          fromTable: row.from_table,
          fromSchema: row.from_schema,
          fromColumn: row.from_column,
          onUpdate: row.on_update,
          onDelete: row.on_delete,
          isComposite: false,
        };
      }

      // If there are multiple parts, it's a composite key
      const firstPart = sortedKeyParts[0];
      return {
        constraintName: firstPart.name,
        toTable: firstPart.to_table,
        toSchema: firstPart.to_schema,
        toColumn: sortedKeyParts.map(p => p.to_column),
        fromTable: firstPart.from_table,
        fromSchema: firstPart.from_schema,
        fromColumn: sortedKeyParts.map(p => p.from_column),
        onUpdate: firstPart.on_update,
        onDelete: firstPart.on_delete,
        isComposite: true,
      };
    });

    log.debug("incoming keys result", result);
    return result;
  }
  async query(queryText: string, _options?: any): Promise<CancelableQuery> {
    const conn = await this.pool.connect();

    return {
      execute: async(): Promise<NgQueryResult[]> => {
        try {
          return await this.executeQuery(queryText, { connection: conn })
        } catch (err) {
          // need to figure out what is thrown when canceled
          throw err;
        } finally {
          await conn.release();
        }
      },
      async cancel() {
        if (!conn) {
          throw new Error('Query not ready to be canceled');
        }

        // only way to cancel a query is to just force a disconnect
        await conn.disconnect();
        await conn.drop();
      }
    }
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    const data = await this.driverExecuteMultiple(queryText, options);

    const commands = this.identifyCommands(queryText).map((item) => item.type);

    return data.map((result, idx) => {
      const fields = result.rows && result.rows.length ? Object.keys(result.rows[0]).map((k) => ({
        name: k,
        id: k
      })) : undefined;

      return {
        command: commands[idx],
        rows: result.rows,
        fields,
        rowCount: result.rows?.length || 0,
        affectedRows: result.rowsAffected
      }
    })
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    let databases;
    try {
      // this is only usable by priveleged users, so we need a fallback
      databases = await this.driverExecuteSingle("CALL sa_db_info()");
    } catch {
      databases = await this.driverExecuteSingle("SELECT DB_NAME() as Alias");
    }

    return databases.rows.map((db) => db.Alias);
  }

  async defaultSchema(): Promise<string | null> {
    const sql = `SELECT USER_NAME() as schema;`;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows && rows.length > 0 ? rows[0].schema : 'DBA';
  }

  async getTableProperties(table: string, schema?: string): Promise<TableProperties> {
    schema = schema ?? await this.defaultSchema();
    const triggers = await this.listTableTriggers(table, schema);
    const indexes = await this.listTableIndexes(table, schema);
    const relations = await this.getTableKeys(table, schema);
    
    // Get table size using sa_table_page_usage procedure
    let size = 0;
    let indexSize = 0;
    
    try {
      const sizeQuery = `
        SELECT 
          PROPERTY('PageSize') * TablePages AS size,
          PROPERTY('PageSize') * IndexPages AS index_size
        FROM sa_table_page_usage()
        WHERE TableName = ${D.escapeString(table, true)}
      `;
      
      const sizeResult = await this.driverExecuteSingle(sizeQuery);
      if (sizeResult.rows && sizeResult.rows.length > 0) {
        size = Number(sizeResult.rows[0].size) || 0;
        indexSize = Number(sizeResult.rows[0].index_size) || 0;
      }
    } catch (err) {
      log.error('Error getting table size', err);
    }

    return {
      size,
      indexSize,
      triggers,
      indexes,
      relations
    };
  }

  async getQuerySelectTop(table: string, limit: number, schema?: string): Promise<string> {
    return `SELECT TOP ${limit} * FROM ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)};`;
  }

  async listMaterializedViews(filter?: FilterOptions): Promise<TableOrView[]> {
    const schemaFilter = buildSchemaFilter(filter, 'table_schema');
    const sql = `
      SELECT
        t.table_name,
        u.user_name as table_schema
      FROM SYS.SYSTABLE t
      JOIN SYS.SYSUSER u ON t.creator = u.user_id
      WHERE t.table_type = 'MAT VIEW'
      ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
      ORDER BY table_schema, table_name;
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((item) => ({
      schema: item.table_schema,
      name: item.table_name,
      entityType: 'view'
    }));
  }

  async getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
    log.debug('finding primary keys for', table, schema);
    
    schema = schema || 'dbo';
    const sql = `
      SELECT 
        c.column_name AS COLUMN_NAME,
        CAST(ROW_NUMBER() OVER (ORDER BY c.column_id) AS INTEGER) AS ORDINAL_POSITION
      FROM SYS.SYSTABLE t
      JOIN SYS.SYSUSER u ON t.creator = u.user_id
      JOIN SYS.SYSCOLUMN c ON t.table_id = c.table_id
      WHERE t.table_name = ${D.escapeString(table, true)}
      AND u.user_name = ${D.escapeString(schema, true)}
      AND c.pkey = 'Y'
      ORDER BY c.column_id
    `;
    
    const { rows } = await this.driverExecuteSingle(sql);
    if (!rows || rows.length === 0) return [];

    return rows.map((r) => ({
      columnName: r.COLUMN_NAME,
      position: r.ORDINAL_POSITION
    }));
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string> {
    const res = await this.getPrimaryKeys(table, schema);
    return res.length === 1 ? res[0].columnName : null;
  }
  async listCharsets(): Promise<string[]> {
    const sql = `
      SELECT DISTINCT cs_label as character_set FROM SYS.SYSCOLLATIONMAPPINGS;
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map((c) => c.character_set);
  }

  async getDefaultCharset(): Promise<string> {
    const sql = `
      SELECT DB_PROPERTY('CharSet') as charset;
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map((c) => c.charset)[0];
  }

  async listCollations(charset: string): Promise<string[]> {
    const sql = `
      SELECT
        collation_label
      FROM SYS.SYSCOLLATIONMAPPINGS
      WHERE cs_label = ${D.escapeString(charset, true)};
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map((c) => c.collation_label);
  }

  async createDatabase(databaseName: string, charset?: string, collation?: string): Promise<string> {
    // Create the database
    const sql = await this.createDatabaseSQL(databaseName, charset, collation);
    
    try {
      await this.driverExecuteSingle(sql);
      return databaseName;
    } catch (err) {
      log.error('Error creating database:', err);
      throw err;
    }
  }

  async createDatabaseSQL(databaseName?: string, charset?: string, collation?: string): Promise<string> {
    databaseName = databaseName || 'newdatabase';
    
    // Build the database file path - SQL Anywhere requires a file path
    // We'll create it in the user's home directory as a default
    const dbFilePath = `~/sql_anywhere/${databaseName}.db`;
    
    // Build the SQL command
    let sql = `CREATE DATABASE '${dbFilePath}'`;
    
    // Add character set if specified
    if (charset) {
      sql += ` CHAR SET '${charset}'`;
    }
    
    // Add collation if specified
    if (collation) {
      sql += ` NCHAR COLLATION '${collation}'`;
    }
    
    return sql;
  }

  async getTableCreateScript(table: string, schema?: string): Promise<string> {
    // Use multiple simpler queries instead of a single complex one
    
    // Get table info
    const tableInfoSql = `
      SELECT 
        u.user_name,
        t.table_name,
        t.table_id
      FROM systable t
      JOIN sysuser u ON t.creator = u.user_id
      WHERE t.table_name = ${D.escapeString(table, true)}
        AND u.user_name = ${D.escapeString(schema, true)}
    `;
    
    const tableInfo = await this.driverExecuteSingle(tableInfoSql);
    if (!tableInfo.rows || tableInfo.rows.length === 0) {
      return '';
    }
    
    const userName = tableInfo.rows[0].user_name;
    const tableName = tableInfo.rows[0].table_name;
    const tableId = tableInfo.rows[0].table_id;
    
    // Get column info
    const columnsSql = `
      SELECT 
        c.column_name,
        d.domain_name,
        c.width,
        c.scale,
        c."nulls",
        c."default",
        c.pkey,
        c.column_id
      FROM syscolumn c
      JOIN sysdomain d ON c.domain_id = d.domain_id
      WHERE c.table_id = ${tableId}
      ORDER BY c.column_id ASC
    `;
    
    const columnsResult = await this.driverExecuteSingle(columnsSql);
    const columns = columnsResult.rows;
    
    // Get foreign keys
    const fkSql = `
      SELECT 
        c_for.column_name AS foreign_column,
        u_pri.user_name AS primary_schema,
        t_pri.table_name AS primary_table,
        c_pri.column_name AS primary_column
      FROM sysfkey fk
      JOIN sysidxcol ic_for ON fk.foreign_index_id = ic_for.index_id AND ic_for.table_id = fk.foreign_table_id
      JOIN syscolumn c_for ON ic_for.table_id = c_for.table_id AND ic_for.column_id = c_for.column_id
      JOIN sysidxcol ic_pri ON fk.primary_index_id = ic_pri.index_id AND ic_pri.table_id = fk.primary_table_id
      JOIN syscolumn c_pri ON ic_pri.table_id = c_pri.table_id AND ic_pri.column_id = c_pri.column_id
      JOIN systable t_pri ON fk.primary_table_id = t_pri.table_id
      JOIN sysuser u_pri ON t_pri.creator = u_pri.user_id
      WHERE fk.foreign_table_id = ${tableId}
        AND ic_for.sequence = ic_pri.sequence
    `;
    
    const fkResult = await this.driverExecuteSingle(fkSql);
    const foreignKeys = fkResult.rows;
    
    // Build the CREATE TABLE statement
    
    // Start with the table name
    let createSql = `CREATE TABLE ${userName}.${tableName} (\n`;
    
    // Add column definitions
    const columnDefs = columns.map(c => {
      let dataType = c.domain_name.toLowerCase();
      
      // Start with column name
      let def = `  ${c.column_name} `;
      
      // Handle data types correctly based on SQL Anywhere syntax
      switch (dataType) {
        case 'char':
        case 'varchar':
        case 'binary':
        case 'varbinary':
          // Character/binary types need width
          def += `${dataType}(${c.width})`;
          break;
          
        case 'numeric':
        case 'decimal':
          // These types can have precision and scale
          if (c.width !== null) {
            def += `${dataType}(${c.width}${c.scale !== null ? `, ${c.scale}` : ''})`;
          } else {
            def += dataType;
          }
          break;
          
        case 'long varchar':
        case 'text':
        case 'long binary':
        case 'image':
          // These types don't take parameters
          def += dataType;
          break;
          
        default:
          // For int, bigint, smallint, tinyint, bit, etc. - no parameters
          def += dataType;
      }
      
      // Add nullability
      def += c.nulls === 'N' ? ' NOT NULL' : ' NULL';
      
      // Add default if exists
      if (c.default !== null) {
        def += ` DEFAULT ${c.default}`;
      }
      
      return def;
    });
    
    createSql += columnDefs.join(',\n');
    
    // Add primary key if any
    const pkColumns = columns.filter(c => c.pkey === 'Y').map(c => c.column_name);
    if (pkColumns.length > 0) {
      createSql += ',\n  PRIMARY KEY (' + pkColumns.join(', ') + ')';
    }
    
    // Add foreign keys if any
    if (foreignKeys.length > 0) {
      const fkDefs = foreignKeys.map(fk => 
        `  FOREIGN KEY (${fk.foreign_column}) REFERENCES ${fk.primary_schema}.${fk.primary_table}(${fk.primary_column})`
      );
      createSql += ',\n' + fkDefs.join(',\n');
    }
    
    // Close the statement
    createSql += '\n);';
    
    return createSql;
  }
  async getViewCreateScript(view: string, schema?: string): Promise<string[]> {
    const sql = `
      SELECT
        v.viewtext AS definition
      FROM SYS.SYSVIEWS v
      JOIN SYS.SYSUSER u ON v.vcreator = u.user_name
      WHERE v.viewname = ${D.escapeString(view, true)}
      AND u.user_name = ${D.escapeString(schema, true)};
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((row) => row.definition);
  }

  async getRoutineCreateScript(routine: string, _type: string, schema?: string): Promise<string[]> {
    const sql = `
      SELECT
        p.source        AS definition
      FROM sysprocedure p
      JOIN sysuser u ON p.creator = u.user_id
      WHERE p.proc_name = ${D.escapeString(routine, true)}
        AND u.user_name = ${D.escapeString(schema, true)};
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map((row) => row.definition);
  }

  async executeApplyChanges(changes: TableChanges): Promise<any[]> {
    let results = [];

    await this.runWithConnection(async (connection) => {
      try {
        if (changes.inserts && changes.inserts.length > 0) {
          await this.insertRows(changes.inserts, connection);
        }

        if (changes.updates && changes.updates.length > 0) {
          results = await this.updateValues(changes.updates, connection);
        }

        if (changes.deletes && changes.deletes.length > 0) {
          await this.deleteRows(changes.deletes, connection);
        }

        await connection.commit();
      } catch (ex) {
        log.error("query exception: ", ex);
        await connection.rollback();
        throw ex;
      }
    });

    return results;
  }

  async insertRows(inserts: TableInsert[], connection: SqlAnywhereConn) {
    for (const insert of inserts) {
      const columns = await this.listTableColumns(
        insert.table,
        insert.schema
      );
      // not sure if this will work
      const command = buildInsertQuery(this.knex, insert, { columns });
      await this.driverExecuteSingle(command, { connection, autoCommit: false });
    }
  }

  async updateValues(updates: TableUpdate[], connection: SqlAnywhereConn) {
    const sql = buildUpdateQueries(this.knex, updates).join(';');

    await this.driverExecuteSingle(sql, { connection, autoCommit: false });

    const updateSql = buildSelectQueriesFromUpdates(this.knex, updates).join(';');
    const data = await this.driverExecuteSingle(updateSql, { connection, autoCommit: false });

    return [data.rows[0]]
  }

  async deleteRows(deletes: TableDelete[], connection: SqlAnywhereConn) {
    const sql = buildDeleteQueries(this.knex, deletes).join(';');

    await this.driverExecuteSingle(sql, { connection, autoCommit: false });
  }

  // as far as I can tell, this isn't used anywhere so not going to implement it
  setTableDescription(_table: string, _description: string, _schema?: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  // looks like anywhere doesn't support this
  async setElementNameSql(_elementName: string, _newElementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    return '';
  }

  async dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    if ([DatabaseElement.DATABASE, DatabaseElement.SCHEMA].includes(typeOfElement)) {
      throw new Error(`Cannot drop element type ${typeOfElement}`);
    }
    schema = schema ?? await this.defaultSchema();

    let type = D.wrapLiteral(DatabaseElement[typeOfElement]);

    if (typeOfElement === DatabaseElement['MATERIALIZED-VIEW']) {
      type = 'VIEW';
    }

    const sql = `DROP ${type} ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(elementName)};`;

    await this.driverExecuteSingle(sql);
  }

  async truncateElementSql(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string> {
    if (typeOfElement !== DatabaseElement.TABLE) return '';
    schema = schema ?? await this.defaultSchema()
    return `TRUNCATE TABLE ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(elementName)}`;
  }

  async truncateAllTables(schema?: string): Promise<void> {
    schema = schema ?? await this.defaultSchema();
    const tables = (await this.listTables({ schema })).map((t) => t.name);

    const truncateAll = tables.map((table) => `
      TRUNCATE TABLE ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)};
    `).join('');

    await this.driverExecuteMultiple(truncateAll);
  }

  async getTableLength(table: string, schema?: string): Promise<number> {
    const schemaString = schema ? `${this.wrapIdentifier(schema)}.` : '';

    const baseSQL = `
      FROM ${schemaString}${this.wrapIdentifier(table)}
    `;

    const countQuery = `
      SELECT COUNT(*) as total ${baseSQL};
    `;

    const countResults = await this.driverExecuteSingle(countQuery);
    const rowWithTotal = countResults.rows.find((row) => row.total );
    const totalRecords = rowWithTotal ? rowWithTotal.total : 0;
    return totalRecords
  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<TableResult> {
    const columns = await this.listTableColumns(table);
    const query = await this.selectTopSql(table, offset, limit, orderBy, filters, schema, selects);
    log.info("QUERY HERE: ", query);

    const result = await this.driverExecuteSingle(query);
    const fields = columns.map((v) => v.bksField).filter((v) => selects && selects.length > 0 ? selects.includes(v.name) : true);
    const rows = await this.serializeQueryResult(result, fields);
    return { result: rows, fields };
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], schema?: string, selects?: string[]): Promise<string> {
    const filterString = _.isString(filters) ? `WHERE ${filters}` : this.buildFilterString(filters)

    const orderByString = this.genOrderByString(orderBy)
    const schemaString = schema ? `${this.wrapIdentifier(schema)}.` : ''

    const offsetString = (_.isNumber(offset) && _.isNumber(limit)) ?
      `TOP ${limit} START AT ${offset + 1}` : '';
    const selectsString = selects.map((s) => this.wrapIdentifier(s)).join(", ");
    const selectSQL = `
      SELECT ${offsetString} ${selectsString}
    `;
    const baseSQL = `
      FROM ${schemaString}${this.wrapIdentifier(table)}
      ${filterString}
    `

    const query = `
      ${selectSQL} ${baseSQL}
      ${orderByString}
    `;
    return query
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    schema = schema ?? await this.defaultSchema();
    const columns = await this.listTableColumns(table, schema);
    const rowCount = await this.getTableLength(table, schema);
    
    const conn = await this.pool.connect();
    
    // Import SqlAnywhereCursor
    const { SqlAnywhereCursor } = await import('./anywhere/SqlAnywhereCursor');
    
    return {
      totalRows: Number(rowCount),
      columns,
      cursor: new SqlAnywhereCursor(conn, {
        schema,
        table,
        orderBy,
        filters,
        chunkSize
      }, this)
    };
  }

  queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    throw new Error('Method not implemented.');
  }

  async duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void> {
    const sql = await this.duplicateTableSql(tableName, duplicateTableName, schema);

    await this.driverExecuteSingle(sql);
  }

  async duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): Promise<string> {
    schema = this.wrapIdentifier(schema ?? await this.defaultSchema());
    tableName = this.wrapIdentifier(tableName);
    duplicateTableName = this.wrapIdentifier(duplicateTableName);
    const sql = `
      SELECT * INTO ${schema}.${duplicateTableName}
      FROM ${schema}.${tableName};
    `;

    return sql;
  }

  wrapIdentifier(value: string): string {
    return D.wrapIdentifier(value);
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<SQLAnywhereResult | SQLAnywhereResult[]> {
    const conn: SqlAnywhereConn = options.connection ? options.connection : await this.pool.connect();
    const autoCommit = options.autoCommit ?? true;

    const runQuery = async (connection: SqlAnywhereConn) => {
      const queries = this.identifyCommands(q);
      const results: SQLAnywhereResult[] = [];
      for (let query of queries) {
        log.info('EXECUTING QUERY: ', query.text);
        const result = await connection.query(query.text, autoCommit);
        log.info('RECEIVED RESULT: ', result);

        if (!result) {
          continue; // was a DDL statement
        } else if (typeof result === 'number') {
          results.push({
            rowsAffected: result
          } as SQLAnywhereResult);
        } else {
          results.push({
            rows: result
          } as SQLAnywhereResult);
        }
      }
      return results;
    }

    const results = await runQuery(conn);
    if (!options.connection) {
      await conn.release()
    }
    return results;
  }

  async runWithConnection<T>(child: (c: SqlAnywhereConn) => Promise<T>): Promise<T> {
    const connection = await this.pool.connect();
    try {
      return await child(connection)
    } finally {
      await connection.release();
    }
  }

  private identifyCommands(queryText: string) {
    try {
      return identify(queryText, { strict: false, dialect: 'mssql' });
    } catch (err) {
      return [];
    }
  }

  protected parseTableColumn(column: any): BksField {
    return {
      name: column.column_name,
      bksType: column.data_type.includes('varbinary') ? 'BINARY' : 'UNKNOWN',
    };
  }

  private genOrderByString(orderBy: OrderBy[]) {
    if (!orderBy) return ""

    let orderByString = "ORDER BY (SELECT NULL)"
    if (orderBy && orderBy.length > 0) {
      orderByString = "ORDER BY " + (orderBy.map((item: {field: any, dir: any}) => {
        if (_.isObject(item)) {
          return `${this.wrapIdentifier(item.field)} ${item.dir.toUpperCase()}`
        } else {
          return this.wrapIdentifier(item)
        }
      })).join(",")
    }
    return orderByString
  }

  private buildFilterString(filters: TableFilter[]) {
    let filterString = ""
    if (filters && filters.length > 0) {
      const allFilters = filters.map((item) => {
        let wrappedValue = _.isArray(item.value) ?
          `(${item.value.map((v) => D.escapeString(v, true)).join(',')})` :
          D.escapeString(item.value, true)

        if (item.type.includes('is')) wrappedValue = 'NULL';

        return `${this.wrapIdentifier(item.field)} ${item.type.toUpperCase()} ${wrappedValue}`
      })
      filterString = "WHERE " + joinFilters(allFilters, filters)
    }
    return filterString
  }

}
