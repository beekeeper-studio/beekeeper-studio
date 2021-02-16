// Copyright (c) 2015 The SQLECTRON Team

import { readFileSync } from 'fs';

import pg, { PoolClient, QueryResult, Pool, PoolConfig } from 'pg';
import { identify } from 'sql-query-identifier';
import _ from 'lodash'
import knexlib from 'knex'
import logRaw from 'electron-log'

import { FilterOptions, DatabaseClient, OrderBy, TableFilter, TableUpdateResult, TableResult, Routine, TableChanges, TableUpdate, TableDelete, DatabaseFilterOptions, TableKey, SchemaFilterOptions, RoutineType, RoutineParam, IDbConnectionServerConfig, NgQueryResult } from '../client'
import { buildDatabseFilter, buildDeleteQueries, buildSchemaFilter, buildSelectQueriesFromUpdates, buildUpdateQueries } from './utils';
import { createCancelablePromise } from '../../../common/utils';
import { errors, Error as CustomError } from '../../errors';
import globals from '../../../common/globals';


interface HasPool {
  pool: Pool
}

interface VersionInfo {
  isPostgres: boolean
  isCockroach: boolean
  isRedshift: boolean
  number: number
  version: string
}

interface HasConnection {
  connection: PoolClient
}

type Conn = HasPool | HasConnection

function isPool(x: any): x is HasPool {
  return x.pool !== undefined
}

function isConnection(x: any): x is HasConnection {
  return x.connection !== undefined
}

const log = logRaw.scope('postgresql')
const logger = () => log

const knex = knexlib({ client: 'pg'})

const pgErrors = {
  CANCELED: '57014',
};

let dataTypes: any = {}

/**
 * Do not convert DATE types to JS date.
 * It ignores of applying a wrong timezone to the date.
 * TODO: do not convert as well these same types with array (types 1115, 1182, 1185)
 */
pg.types.setTypeParser(1082, 'text', (val) => val); // date
pg.types.setTypeParser(1114, 'text', (val) => val); // timestamp without timezone
pg.types.setTypeParser(1184, 'text', (val) => val); // timestamp


/**
 * Gets the version details for the connection.
 *
 * Example version strings:
 * CockroachDB CCL v1.1.0 (linux amd64, built 2017/10/12 14:50:18, go1.8.3)
 * CockroachDB CCL v20.1.1 (x86_64-unknown-linux-gnu, built 2020/05/19 14:46:06, go1.13.9)
 *
 * PostgreSQL 9.4.26 on x86_64-pc-linux-gnu (Debian 9.4.26-1.pgdg90+1), compiled by gcc (Debian 6.3.0-18+deb9u1) 6.3.0 20170516, 64-bit
 * PostgreSQL 12.3 (Debian 12.3-1.pgdg100+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 8.3.0-6) 8.3.0, 64-bit
 *
 * PostgreSQL 8.0.2 on i686-pc-linux-gnu, compiled by GCC gcc (GCC) 3.4.2 20041017 (Red Hat 3.4.2-6.fc3), Redshift 1.0.12103
 */
async function getVersion(conn: HasPool): Promise<VersionInfo> {
  const { version } = (await driverExecuteSingle(conn, {query: "select version()"})).rows[0]
  if (!version) {
    return {
      version: '',
      isPostgres: false,
      isCockroach: false,
      isRedshift: false,
      number: 0
    }
  }

  const isPostgres = version.toLowerCase().includes('postgresql')
  const isCockroach = version.toLowerCase().includes('cockroachdb')
  const isRedshift = version.toLowerCase().includes('redshift')
  return {
    version,
    isPostgres,
    isCockroach,
    isRedshift,
    number: parseInt(
      version.split(" ")[isPostgres ? 1 : 2].replace(/^v/i, '').split(".").map((s: string) => s.padStart(2, "0")).join("").padEnd(6, "0"),
      10
    )
  }
}


async function getTypes(conn: HasPool): Promise<any> {
  const version = await getVersion(conn)
  let sql
  if (version.isPostgres && version.number < 80300) {
    sql = `
      SELECT      n.nspname as schema, t.typname as typename, t.oid::int4 as typeid
      FROM        pg_type t
      LEFT JOIN   pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE       (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
      AND     t.typname !~ '^_'
      AND     n.nspname NOT IN ('pg_catalog', 'information_schema');
    `
  } else {
    sql = `
      SELECT      n.nspname as schema, t.typname as typename, t.oid::int4 as typeid
      FROM        pg_type t
      LEFT JOIN   pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE       (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
      AND     NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
      AND     n.nspname NOT IN ('pg_catalog', 'information_schema');
    `
  }

  const data = await driverExecuteSingle(conn, { query: sql })
  const result: any = {}
  data.rows.forEach((row: any) => {
    result[row.typeid] = row.typename
  })
  _.merge(result, _.invert(pg.types.builtins))
  result[1009] = 'array'
  return result
}


export default async function (server: any, database: any): Promise<DatabaseClient> {
  const dbConfig = configDatabase(server, database);
  logger().debug('create driver client for postgres with config %j', dbConfig);

  const conn: HasPool = {
    pool: new pg.Pool(dbConfig),
  };

  logger().debug('connected');
  const defaultSchema = await getSchema(conn);
  logger().debug(`loaded schema ${defaultSchema}`)
  dataTypes = await getTypes(conn)

  return {
    /* eslint max-len:0 */
    supportedFeatures: () => ({ customRoutines: true}),
    wrapIdentifier,
    disconnect: () => disconnect(conn),
    listTables: (db: string, filter: FilterOptions | undefined) => listTables(conn, filter),
    listViews: (filter?: FilterOptions) => listViews(conn, filter),
    listMaterializedViews: (filter?: FilterOptions) => listMaterializedViews(conn, filter),
    listRoutines: (filter?: FilterOptions) => listRoutines(conn, filter),
    listTableColumns: (db, table, schema = defaultSchema) => listTableColumns(conn, db, table, schema),
    listMaterializedViewColumns: (db, table, schema = defaultSchema) => listMaterializedViewColumns(conn, db, table, schema),
    listTableTriggers: (table, schema = defaultSchema) => listTableTriggers(conn, table, schema),
    listTableIndexes: (db, table, schema = defaultSchema) => listTableIndexes(conn, table, schema),
    listSchemas: (db, filter?: SchemaFilterOptions) => listSchemas(conn, filter),
    getTableReferences: (table, schema = defaultSchema) => getTableReferences(conn, table, schema),
    // TODO
    getTableKeys: (db, table, schema = defaultSchema) => getTableKeys(conn, db, table, schema),
    getPrimaryKey: (db, table, schema = defaultSchema) => getPrimaryKey(conn, db, table, schema),
    applyChanges: (changes) => applyChanges(conn, changes),
    query: (queryText, schema = defaultSchema) => query(conn, queryText, schema),
    executeQuery: (queryText, schema = defaultSchema) => executeQuery(conn, queryText),
    listDatabases: (filter?: DatabaseFilterOptions) => listDatabases(conn, filter),
    selectTop: (table: string, offset: Number, limit: Number, orderBy: OrderBy[], filters: TableFilter[], schema: string) => selectTop(conn, table, offset, limit, orderBy, filters, schema),
    getQuerySelectTop: (table, limit, schema = defaultSchema) => getQuerySelectTop(conn, table, limit, schema),
    getTableCreateScript: (table, schema = defaultSchema) => getTableCreateScript(conn, table, schema),
    getViewCreateScript: (view, schema = defaultSchema) => getViewCreateScript(conn, view, schema),
    getRoutineCreateScript: (routine, type, schema = defaultSchema) => getRoutineCreateScript(conn, routine, type, schema),
    truncateAllTables: (_, schema = defaultSchema) => truncateAllTables(conn, schema),
  };
}


export function disconnect(conn: HasPool) {
  conn.pool.end();
}



export async function listTables(conn: HasPool, filter: FilterOptions = { schema: 'public' }) {
  const schemaFilter = buildSchemaFilter(filter, 'table_schema');
  const sql = `
    SELECT
      table_schema as schema,
      table_name as name
    FROM information_schema.tables
    WHERE table_type NOT LIKE '%VIEW%'
    ${schemaFilter ? `AND ${schemaFilter}` : ''}
    ORDER BY table_schema, table_name
  `;

  const data = await driverExecuteSingle(conn, { query: sql });

  return data.rows;
}

export async function listViews(conn: HasPool, filter: FilterOptions = { schema: 'public' }) {
  const schemaFilter = buildSchemaFilter(filter, 'table_schema');
  const sql = `
    SELECT
      table_schema as schema,
      table_name as name
    FROM information_schema.views
    ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
    ORDER BY table_schema, table_name
  `;

  const data = await driverExecuteSingle(conn, { query: sql });

  return data.rows;
}

export async function listMaterializedViews(conn: HasPool, filter: FilterOptions = { schema: 'public' }) {
  const version = await getVersion(conn);
  if (!version.isPostgres || version.number < 90003) {
    return []
  }

  const schemaFilter = buildSchemaFilter(filter, 'schemaname')
  const sql = `
    SELECT
      schemaname as schema,
      matviewname as name
    FROM pg_matviews
    ${schemaFilter ? `WHERE ${schemaFilter}`: ''}
    order by schemaname, matviewname;
  `

  const data = await driverExecuteSingle(conn, {query: sql});
  return data.rows;
}

async function selectTop(
  conn: HasPool,
  table: string,
  offset: Number,
  limit: Number,
  orderBy: OrderBy[],
  filters: TableFilter[],
  schema = 'public'
): Promise<TableResult> {

  let orderByString = ""
  let filterString = ""
  let params: string[] = []

  if (orderBy && orderBy.length > 0) {
    orderByString = "order by " + (orderBy.map((item) => {
      if (_.isObject(item)) {
        return `${wrapIdentifier(item.field)} ${item.dir}`
      } else {
        return wrapIdentifier(item)
      }
    })).join(",")
  }

  if (_.isString(filters)) {
    filterString = `WHERE ${filters}`
  } else if (filters && filters.length > 0) {
    filterString = "WHERE " + filters.map((item, index) => {
      return `${wrapIdentifier(item.field)} ${item.type} $${index + 1}`
    }).join(" AND ")

    params = filters.map((item) => {
      return item.value
    })
  }

  const baseSQL = `
    FROM ${wrapIdentifier(schema)}.${wrapIdentifier(table)}
    ${filterString}
  `
  const countQuery = `
    select count(1) as total ${baseSQL}
  `
  const query = `
    SELECT * ${baseSQL}
    ${orderByString}
    LIMIT ${limit}
    OFFSET ${offset}
    `
  log.debug("select Top query & params", countQuery, query, params)
  const countResults = await driverExecuteSingle(conn, { query: countQuery, params })
  const result = await driverExecuteSingle(conn, { query, params })
  const rowWithTotal = countResults.rows.find((row: any) => { return row.total })
  const totalRecords = rowWithTotal ? rowWithTotal.total : 0
  log.debug("selectTop:", result.rows)
  return {
    result: result.rows,
    totalRecords: Number(totalRecords),
    fields: result.fields.map(f => f.name)
  }
}

export async function listRoutines(conn: HasPool, filter?: FilterOptions): Promise<Routine[]> {
  const version = await getVersion(conn)
  if (version.isCockroach) {
    return []
  }

  const schemaFilter = buildSchemaFilter(filter, 'r.routine_schema');
  const sql = `
    SELECT
      r.specific_name as id,
      r.routine_schema as routine_schema,
      r.routine_name as name,
      r.routine_type as routine_type,
      r.data_type as data_type
    FROM INFORMATION_SCHEMA.ROUTINES r
    where r.routine_schema not in ('sys', 'information_schema',
                                'pg_catalog', 'performance_schema')
    ${schemaFilter ? `AND ${schemaFilter}` : ''}
    ORDER BY routine_schema, routine_name
  `;

  const paramsSQL = `
    select 
        r.routine_schema as routine_schema,
        r.specific_name as specific_name,
        p.parameter_name as parameter_name,
        p.character_maximum_length as char_length,
        p.data_type as data_type
  from information_schema.routines r
  left join information_schema.parameters p
            on p.specific_schema = r.routine_schema
            and p.specific_name = r.specific_name
  where r.routine_schema not in ('sys', 'information_schema',
                                'pg_catalog', 'performance_schema')
    ${schemaFilter ? `AND ${schemaFilter}` : ''}

      AND p.parameter_mode = 'IN'
  order by r.routine_schema,
          r.specific_name,
          p.ordinal_position;

  `


  const data = await driverExecuteSingle(conn, { query: sql });
  const paramsData = await driverExecuteSingle(conn, { query: paramsSQL })
  const grouped = _.groupBy(paramsData.rows, 'specific_name')

  return data.rows.map((row) => {
    const params = grouped[row.id] || []
    return {
      schema: row.routine_schema,
      name: row.name,
      type: row.routine_type ? row.routine_type.toLowerCase() : 'function',
      returnType: row.data_type,
      id: row.id,
      routineParams: params.map((p, i) => {
        return {
          name: p.parameter_name || `arg${i+1}`,
          type: p.data_type,
          length: p.char_length || undefined
        }
      })
    }
  });
}

export async function listTableColumns(conn: Conn, database: string, table?: string, schema?: string) {
  // if you provide table, you have to provide schema
  const clause = table ? "WHERE table_schema = $1 AND table_name = $2" : ""
  const params = table ? [schema, table] : []
  if (table && !schema) {
    throw new Error("Table '${table}' provided for listTableColumns, but no schema name")
  }
  const sql = `
    SELECT
      table_schema,
      table_name,
      column_name,
      CASE
        WHEN character_maximum_length is not null  and udt_name != 'text'
          THEN CONCAT(udt_name, concat('(', concat(character_maximum_length::varchar(255), ')')))
        WHEN datetime_precision is not null THEN
          CONCAT(udt_name, concat('(', concat(datetime_precision::varchar(255), ')')))
        ELSE udt_name
      END as data_type
    FROM information_schema.columns
    ${clause}
    ORDER BY table_schema, table_name, ordinal_position
  `;

  const data = await driverExecuteSingle(conn, { query: sql, params });

  return data.rows.map((row: any) => ({
    schemaName: row.table_schema,
    tableName: row.table_name,
    columnName: row.column_name,
    dataType: row.data_type,
  }));
}

export async function listMaterializedViewColumns(conn: Conn, database: string, table: string, schema: string) {
  const clause = table ? `AND s.nspname = $1 AND t.relname = $2` : ''
  if (table && !schema) {
    throw new Error("Cannot get columns for '${table}, no schema provided'")
  }
  const sql = `
    SELECT s.nspname, t.relname, a.attname,
          pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
          a.attnotnull
    FROM pg_attribute a
      JOIN pg_class t on a.attrelid = t.oid
      JOIN pg_namespace s on t.relnamespace = s.oid
    WHERE a.attnum > 0
      AND NOT a.attisdropped
      ${clause}
    ORDER BY a.attnum;
  `
  const params = table ? [schema, table] : []
  const data = await driverExecuteSingle(conn, {query: sql, params});
  return data.rows.map((row) => ({
    schemaName: row.nspname,
    tableName: row.relname,
    columnName: row.attname,
    dataType: row.data_type
  }))
}


export async function listTableTriggers(conn: Conn, table: string, schema: string) {
  const sql = `
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = $1
    AND event_object_table = $2
  `;

  const params = [
    schema,
    table,
  ];

  const data = await driverExecuteSingle(conn, { query: sql, params });

  return data.rows.map((row) => row.trigger_name);
}
export async function listTableIndexes(conn: Conn, table: string, schema: string) {
  const sql = `
    SELECT indexname as index_name
    FROM pg_indexes
    WHERE schemaname = $1
    AND tablename = $2
  `;

  const params = [
    schema,
    table,
  ];

  const data = await driverExecuteSingle(conn, { query: sql, params });

  return data.rows.map((row) => row.index_name);
}

export async function listSchemas(conn: Conn, filter?: SchemaFilterOptions) {
  const schemaFilter = buildSchemaFilter(filter);
  const sql = `
    SELECT schema_name
    FROM information_schema.schemata
    ${schemaFilter ? `WHERE ${schemaFilter}` : ''}
    ORDER BY schema_name
  `;

  const data = await driverExecuteSingle(conn, { query: sql });

  return data.rows.map((row) => row.schema_name);
}

export async function getTableReferences(conn: Conn, table: string, schema: string) {
  const sql = `
    SELECT ctu.table_name AS referenced_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.constraint_table_usage AS ctu
    ON ctu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
    AND tc.table_schema = $2
  `;

  const params = [
    table,
    schema,
  ];

  const data = await driverExecuteSingle(conn, { query: sql, params });

  return data.rows.map((row) => row.referenced_table_name);
}

export async function getTableKeys(conn: Conn, database: string, table: string, schema: string): Promise<TableKey[]> {
  const sql = `
    SELECT
        tc.table_schema as from_schema,
        tc.table_name as from_table,
        kcu.column_name as from_column,
        ccu.table_schema AS to_schema,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column,
        tc.constraint_name
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name=$1 and tc.table_schema = $2;
  `;

  const params = [
    table,
    schema,
  ];

  const data = await driverExecuteSingle(conn, { query: sql, params });

  return data.rows.map((row) => ({
    toTable: row.to_table,
    toSchema: row.to_schema,
    toColumn: row.to_column,
    fromTable: row.from_table,
    fromSchema: row.from_schema,
    fromColumn: row.from_column,
    constraintName: row.constraint_name,
  }));
}

export async function getPrimaryKey(conn: Conn, database: string, table: string, schema: string): Promise<string> {
  
  const tablename = escapeString(schema ? `${wrapIdentifier(schema)}.${wrapIdentifier(table)}` : wrapIdentifier(table))
  const query = `
    SELECT a.attname as column_name, format_type(a.atttypid, a.atttypmod) AS data_type
    FROM   pg_index i
    JOIN   pg_attribute a ON a.attrelid = i.indrelid
                        AND a.attnum = ANY(i.indkey)
    WHERE  i.indrelid = '${tablename}'::regclass
    AND    i.indisprimary;
  `
  log.debug('getPrimaryKey', query, tablename)
  const data = await driverExecuteSingle(conn, { query })
  return data.rows && data.rows[0] && data.rows.length === 1 ? data.rows[0].column_name : null
}

export async function applyChanges(conn: Conn, changes: TableChanges): Promise<TableUpdateResult[]> {
  let results: TableUpdateResult[] = []

  await runWithConnection(conn, async (connection) => {
    const cli = { connection }
    await driverExecuteQuery(cli, { query: 'BEGIN' })

    try {
      if (changes.updates) {
        results = await updateValues(cli, changes.updates)
      }
    
      if (changes.deletes) {
        await deleteRows(cli, changes.deletes)
      }

      await driverExecuteQuery(cli, { query: 'COMMIT'})
    } catch (ex) {
      log.error("query exception: ", ex)
      await driverExecuteQuery(cli, { query: 'ROLLBACK' });
      throw ex
    }
  })

  return results
}

async function updateValues(cli: any, updates: TableUpdate[]): Promise<TableUpdateResult[]> {

  // If a type starts with an underscore - it's an array
  // so we need to turn the string representation back to an array
  updates.forEach((update) => {
    if (update.columnType?.startsWith('_')) {
      update.value = JSON.parse(update.value)
    }
  })

  let results: TableUpdateResult[] = []
  await driverExecuteQuery(cli, { query: buildUpdateQueries(knex, updates).join(";") })
  const data = await driverExecuteSingle(cli, { query: buildSelectQueriesFromUpdates(knex, updates).join(";"), multiple: true })
  results = [data.rows[0]]

  return results
}

async function deleteRows(cli: any, deletes: TableDelete[]) {
  await driverExecuteQuery(cli, { query: buildDeleteQueries(knex, deletes).join(";") })

  return true
}

export function query(conn: Conn, queryText: string, schema: string) {
  let pid: any = null;
  let canceling = false;
  const cancelable = createCancelablePromise(errors.CANCELED_BY_USER);

  return {
    execute(): Promise<NgQueryResult[]> {
      return runWithConnection(conn, async (connection) => {
        const connClient = { connection };

        const dataPid = await driverExecuteSingle(connClient, {
          query: 'SELECT pg_backend_pid() AS pid',
        });
        const rows = dataPid.rows

        pid = rows[0].pid;

        try {
          const data = await Promise.race([
            cancelable.wait(),
            executeQuery(connClient, queryText, true),
          ]);

          pid = null;

          if(!data) {
            return []
          }

          return data
        } catch (err) {
          if (canceling && err.code === pgErrors.CANCELED) {
            canceling = false;
            err.sqlectronError = 'CANCELED_BY_USER';
          }

          throw err;
        } finally {
          cancelable.discard();
        }
      });
    },

    async cancel(): Promise<void> {
      if (!pid) {
        throw new Error('Query not ready to be canceled');
      }

      canceling = true;
      try {
        const data = await driverExecuteSingle(conn, {
          query: `SELECT pg_cancel_backend(${pid});`,
        });

        const rows = data.rows

        if (!rows[0].pg_cancel_backend) {
          throw new Error(`Failed canceling query with pid ${pid}.`);
        }

        cancelable.cancel();
      } catch (err) {
        canceling = false;
        throw err;
      }
    },
  };
}


export async function executeQuery(conn: Conn, queryText: string, arrayMode: boolean = false) {
  const data = await driverExecuteQuery(conn, { query: queryText, multiple: true, arrayMode });

  const commands = identifyCommands(queryText).map((item) => item.type);

  return data.map((result, idx) => parseRowQueryResult(result, commands[idx], arrayMode));
}


export async function listDatabases(conn: Conn, filter?: DatabaseFilterOptions) {
  const databaseFilter = buildDatabseFilter(filter, 'datname');
  const sql = `
    SELECT datname
    FROM pg_database
    WHERE datistemplate = $1
    ${databaseFilter ? `AND ${databaseFilter}` : ''}
    ORDER BY datname
  `;

  const params = [false];

  const data = await driverExecuteSingle(conn, { query: sql, params });

  return data.rows.map((row) => row.datname);
}


export function getQuerySelectTop(conn: Conn, table: string, limit: Number, schema: string) {
  return `SELECT * FROM ${wrapIdentifier(schema)}.${wrapIdentifier(table)} LIMIT ${limit}`;
}

export async function getTableCreateScript(conn: Conn, table: string, schema: string) {
  // Reference http://stackoverflow.com/a/32885178
  const sql = `
    SELECT
      'CREATE TABLE ' || quote_ident(tabdef.schema_name) || '.' || quote_ident(tabdef.table_name) || E' (\n' ||
      array_to_string(
        array_agg(
          '  ' || quote_ident(tabdef.column_name) || ' ' ||  tabdef.type || ' '|| tabdef.not_null
        )
        , E',\n'
      ) || E'\n);\n' ||
      CASE WHEN tc.constraint_name IS NULL THEN ''
           ELSE E'\nALTER TABLE ' || quote_ident($2) || '.' || quote_ident(tabdef.table_name) ||
           ' ADD CONSTRAINT ' || quote_ident(tc.constraint_name)  ||
           ' PRIMARY KEY ' || '(' || substring(constr.column_name from 0 for char_length(constr.column_name)-1) || ')'
      END AS createtable
    FROM
    ( SELECT
        c.relname AS table_name,
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
        CASE
          WHEN a.attnotnull THEN 'NOT NULL'
        ELSE 'NULL'
        END AS not_null,
        n.nspname as schema_name
      FROM pg_class c,
       pg_attribute a,
       pg_type t,
       pg_namespace n
      WHERE c.relname = $1
      AND a.attnum > 0
      AND a.attrelid = c.oid
      AND a.atttypid = t.oid
      AND n.oid = c.relnamespace
      AND n.nspname = $2
      ORDER BY a.attnum DESC
    ) AS tabdef
    LEFT JOIN information_schema.table_constraints tc
    ON  tc.table_name       = tabdef.table_name
    AND tc.table_schema     = tabdef.schema_name
    AND tc.constraint_Type  = 'PRIMARY KEY'
    LEFT JOIN LATERAL (
      SELECT column_name || ', ' AS column_name
      FROM   information_schema.key_column_usage kcu
      WHERE  kcu.constraint_name = tc.constraint_name
      AND kcu.table_name = tabdef.table_name
      AND kcu.table_schema = tabdef.schema_name
      ORDER BY ordinal_position
    ) AS constr ON true
    GROUP BY tabdef.schema_name, tabdef.table_name, tc.constraint_name, constr.column_name;
  `;

  const params = [
    table,
    schema,
  ];

  const data = await driverExecuteSingle(conn, { query: sql, params });

  return data.rows.map((row) => row.createtable);
}

export async function getViewCreateScript(conn: Conn, view: string, schema: string) {
  const createViewSql = `CREATE OR REPLACE VIEW ${wrapIdentifier(schema)}.${view} AS`;

  const sql = 'SELECT pg_get_viewdef($1::regclass, true)';

  const params = [view];

  const data = await driverExecuteSingle(conn, { query: sql, params });

  return data.rows.map((row) => `${createViewSql}\n${row.pg_get_viewdef}`);
}

export async function getRoutineCreateScript(conn: Conn, routine: string, _: string, schema: string) {
  const sql = `
    SELECT pg_get_functiondef(p.oid)
    FROM pg_proc p
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE proname = $1
    AND n.nspname = $2
  `;

  const params = [
    routine,
    schema,
  ];

  const data = await driverExecuteSingle(conn, { query: sql, params });

  return data.rows.map((row) => row.pg_get_functiondef);
}

export function wrapIdentifier(value: string): string {
  if (value === '*') return value;
  const matched = value.match(/(.*?)(\[[0-9]\])/); // eslint-disable-line no-useless-escape
  if (matched) return wrapIdentifier(matched[1]) + matched[2];
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeString(value: string) {
  return value.replace("'", "''")
}


async function getSchema(conn: Conn) {
  const sql = 'SELECT current_schema() AS schema';

  const data = await driverExecuteQuery(conn, { query: sql });
  return data[0].rows[0].schema;
}

export async function truncateAllTables(conn: Conn, schema: string) {
  await runWithConnection(conn, async (connection) => {
    const connClient = { connection };

    const sql = `
      SELECT quote_ident(table_name) as table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      AND table_type NOT LIKE '%VIEW%'
    `;

    const params = [
      schema,
    ];

    const data = await driverExecuteSingle(connClient, { query: sql, params });
    const rows = data.rows

    const truncateAll = rows.map((row) => `
      TRUNCATE TABLE ${wrapIdentifier(schema)}.${wrapIdentifier(row.table_name)}
      RESTART IDENTITY CASCADE;
    `).join('');

    await driverExecuteQuery(connClient, { query: truncateAll, multiple: true });
  });
}


function configDatabase(server: { sshTunnel: boolean, config: IDbConnectionServerConfig}, database: { database: string}) {
  const config: PoolConfig = {
    host: server.config.host,
    port: server.config.port || undefined,
    password: server.config.password || undefined,
    database: database.database,
    max: 5, // max idle connections per time (30 secs)
    connectionTimeoutMillis: globals.psqlTimeout,
  };

  if (server.config.user) {
    config.user = server.config.user
  } else if (server.config.osUser) {
    config.user = server.config.osUser
  }


  if (server.sshTunnel) {
    config.host = server.config.localHost;
    config.port = server.config.localPort;
  }

  if (server.config.ssl) {

    config.ssl = {
    }

    if (server.config.sslCaFile) {
      config.ssl.ca = readFileSync(server.config.sslCaFile);
    }

    if (server.config.sslCertFile) {
      config.ssl.cert = readFileSync(server.config.sslCertFile);
    }

    if (server.config.sslKeyFile) {
      config.ssl.key = readFileSync(server.config.sslKeyFile);
    }
    if (!config.ssl.key && !config.ssl.ca && !config.ssl.cert) {
      // TODO: provide this as an option in settings
      // not per-connection
      // How it works:
      // if false, cert can be self-signed
      // if true, has to be from a public CA
      // Heroku certs are self-signed.
      // if you provide ca/cert/key files, it overrides this
      config.ssl.rejectUnauthorized = false
    } else {
      config.ssl.rejectUnauthorized = server.config.sslRejectUnauthorized
    }
  }

  logger().debug('connection config', config)

  return config;
}

function parseFields(fields: any[], rowResults: boolean) {
  return fields.map((field, idx) => {
    field.dataType = dataTypes[field.dataTypeID] || 'user-defined'
    field.id = rowResults ? `c${idx}` : field.name
    return field
  })
}

function parseRowQueryResult(data: QueryResult, command: string, rowResults: boolean): NgQueryResult {
  const fields = parseFields(data.fields, rowResults)
  const fieldIds = fields.map(f => f.id)
  const isSelect = data.command === 'SELECT';
  return {
    command: command || data.command,
    rows: data.rows.map(r => rowResults ? _.zipObject(fieldIds, r) : r),
    fields: fields,
    rowCount: isSelect ? (data.rowCount || data.rows.length) : undefined,
    affectedRows: !isSelect && !isNaN(data.rowCount) ? data.rowCount : undefined,
  };
}


function identifyCommands(queryText: string) {
  try {
    return identify(queryText);
  } catch (err) {
    return [];
  }
}

interface PostgresQueryArgs {
  query: string
  params?: any[]
  multiple?: boolean
  arrayMode?: boolean
}

async function driverExecuteSingle(conn: Conn | HasConnection, queryArgs: PostgresQueryArgs): Promise<QueryResult> {
  return (await driverExecuteQuery(conn, queryArgs))[0]
}

function driverExecuteQuery(conn: Conn | HasConnection, queryArgs: PostgresQueryArgs): Promise<QueryResult[]> {


  function isQueryResult(x: any): x is QueryResult {
    return x.rows !== undefined
  }

  const runQuery = (connection: pg.PoolClient): Promise<QueryResult[]> => {
    const args = {
      text: queryArgs.query,
      values: queryArgs.params,
      multiResult: queryArgs.multiple,
      rowMode: queryArgs.arrayMode ? 'array' : undefined
    };

    // node-postgres has support for Promise query
    // but that always returns the "fields" property empty
    return new Promise((resolve, reject) => {
      connection.query(args, (err: Error, data: QueryResult | QueryResult[]) => {
        if (err) return reject(err);
        const qr = Array.isArray(data) ? data : [data]
        resolve(qr)
      });
    });
  };

  
  if (isConnection(conn)) {
    return runQuery(conn.connection)
  } else {
    return runWithConnection(conn, runQuery);
  }
}

async function runWithConnection<T>(x: Conn, run: (p: PoolClient) => Promise<T>): Promise<T> {
  const connection: PoolClient = isConnection(x) ? x.connection : await x.pool.connect()
  try {
    return await run(connection);
  } finally {
    connection.release();
  }
}


export const testOnly = {
  parseRowQueryResult
}