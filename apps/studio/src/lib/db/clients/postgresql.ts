// Copyright (c) 2015 The SQLECTRON Team

import { readFileSync } from 'fs';

import pg, { PoolClient, QueryResult, PoolConfig } from 'pg';
import { identify } from 'sql-query-identifier';
import _  from 'lodash'
import knexlib from 'knex'
import logRaw from 'electron-log'

import { DatabaseClient, IDbConnectionServerConfig } from '../client'
import { FilterOptions, OrderBy, TableFilter, TableUpdateResult, TableResult, Routine, TableChanges, TableInsert, TableUpdate, TableDelete, DatabaseFilterOptions, SchemaFilterOptions, NgQueryResult, StreamResults, ExtendedTableColumn, PrimaryKeyColumn, TableIndex, IndexedColumn, } from "../models";
import { buildDatabseFilter, buildDeleteQueries, buildInsertQuery, buildInsertQueries, buildSchemaFilter, buildSelectQueriesFromUpdates, buildUpdateQueries, escapeString, joinQueries } from './utils';
import { createCancelablePromise } from '../../../common/utils';
import { errors } from '../../errors';
import globals from '../../../common/globals';
import { HasPool, VersionInfo, HasConnection, Conn } from './postgresql/types'
import { PsqlCursor } from './postgresql/PsqlCursor';
import { PostgresqlChangeBuilder } from '@shared/lib/sql/change_builder/PostgresqlChangeBuilder';
import { AlterTableSpec, IndexAlterations, RelationAlterations, TableKey } from '@shared/lib/dialects/models';
import { RedshiftChangeBuilder } from '@shared/lib/sql/change_builder/RedshiftChangeBuilder';
import { PostgresData } from '@shared/lib/dialects/postgresql';


const base64 = require('base64-url');
const PD = PostgresData
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

function tableName(table: string, schema?: string): string{
  return schema ? `${PD.wrapIdentifier(schema)}.${PD.wrapIdentifier(table)}` : PD.wrapIdentifier(table);
}


/**
 * Do not convert DATE types to JS date.
 * It ignores of applying a wrong timezone to the date.
 * TODO: do not convert as well these same types with array (types 1115, 1182, 1185)
 */
pg.types.setTypeParser(1082, 'text', (val) => val); // date
pg.types.setTypeParser(1114, 'text', (val) => val); // timestamp without timezone
pg.types.setTypeParser(1184, 'text', (val) => val); // timestamp

/**
 * Convert BYTEA type encoded to hex with '\x' prefix to BASE64 URL (without '+' and '=').
 */
pg.types.setTypeParser(17, 'text', (val) => val ? base64.encode(val.substring(2), 'hex') : '');

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

  const isCockroach = version.toLowerCase().includes('cockroachdb')
  const isRedshift = version.toLowerCase().includes('redshift')
  const isPostgres = !isCockroach && !isRedshift
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
  if ((version.isPostgres && version.number < 80300) || version.isRedshift) {
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

  const version = await getVersion(conn)

  const features = version.isRedshift ? { customRoutines: true, comments: false, properties: false } : { customRoutines: true, comments: true, properties: true}



  return {
    /* eslint max-len:0 */
    supportedFeatures: () => features,
    wrapIdentifier,
    disconnect: () => disconnect(conn),
    listTables: (_db: string, filter: FilterOptions | undefined) => listTables(conn, filter),
    listViews: (filter?: FilterOptions) => listViews(conn, filter),
    listMaterializedViews: (filter?: FilterOptions) => listMaterializedViews(conn, filter),
    listRoutines: (filter?: FilterOptions) => listRoutines(conn, filter),
    listTableColumns: (db, table, schema = defaultSchema) => listTableColumns(conn, db, table, schema),
    listMaterializedViewColumns: (db, table, schema = defaultSchema) => listMaterializedViewColumns(conn, db, table, schema),
    listTableTriggers: (table, schema = defaultSchema) => listTableTriggers(conn, table, schema),
    listTableIndexes: (_db, table, schema = defaultSchema) => listTableIndexes(conn, table, schema),
    listSchemas: (_db, filter?: SchemaFilterOptions) => listSchemas(conn, filter),
    getTableReferences: (table, schema = defaultSchema) => getTableReferences(conn, table, schema),
    getTableKeys: (db, table, schema = defaultSchema) => getTableKeys(conn, db, table, schema),
    getPrimaryKey: (db, table, schema = defaultSchema) => getPrimaryKey(conn, db, table, schema),
    getPrimaryKeys: (db, table, schema = defaultSchema) => getPrimaryKeys(conn, db, table, schema),
    applyChanges: (changes) => applyChanges(conn, changes),
    query: (queryText, schema = defaultSchema) => query(conn, queryText, schema),
    executeQuery: (queryText, _schema = defaultSchema) => executeQuery(conn, queryText),
    listDatabases: (filter?: DatabaseFilterOptions) => listDatabases(conn, filter),
    getTableLength: (table: string, schema: string) => getTableLength(conn, table, schema),
    selectTop: (table: string, offset: number, limit: number, orderBy: OrderBy[], filters: TableFilter[] | string, schema: string = defaultSchema) => selectTop(conn, table, offset, limit, orderBy, filters, schema),
    selectTopStream: (database: string, table: string, orderBy: OrderBy[], filters: TableFilter[] | string, chunkSize: number, schema: string = defaultSchema) => selectTopStream(conn, database, table, orderBy, filters, chunkSize, schema),
    getInsertQuery: (tableInsert: TableInsert): Promise<string> => getInsertQuery(conn, database.database, tableInsert),
    getQuerySelectTop: (table, limit, schema = defaultSchema) => getQuerySelectTop(conn, table, limit, schema),
    getTableCreateScript: (table, schema = defaultSchema) => getTableCreateScript(conn, table, schema),
    getViewCreateScript: (view, schema = defaultSchema) => getViewCreateScript(conn, view, schema),
    getRoutineCreateScript: (routine, type, schema = defaultSchema) => getRoutineCreateScript(conn, routine, type, schema),
    truncateAllTables: (_, schema = defaultSchema) => truncateAllTables(conn, schema),
    getTableProperties: (table, schema = defaultSchema) => getTableProperties(conn, table, schema),

    // alter tables
    alterTableSql: (change: AlterTableSpec) => alterTableSql(conn, change),
    alterTable: (change: AlterTableSpec) => alterTable(conn, change),

    // alter indexes
    alterIndexSql: (payload) => alterIndexSql(payload),
    alterIndex: (payload) => alterIndex(conn, payload),

    // relations
    alterRelationSql: (payload) => alterRelationSql(payload),
    alterRelation: (payload) => alterRelation(conn, payload),

    setTableDescription: (table: string, description: string, schema = defaultSchema) => setTableDescription(conn, table, description, schema),
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

  try {
    const data = await driverExecuteSingle(conn, {query: sql});
    return data.rows;
  } catch (error) {
    log.warn("Unable to fetch materialized views", error)
    return []
  }
}

interface STQOptions {
  table: string,
  orderBy?: OrderBy[],
  filters?: TableFilter[] | string,
  offset?: number,
  limit?: number,
  schema: string,
  version: VersionInfo
  forceSlow?: boolean
}

interface STQResults {
  query: string,
  countQuery: string,
  params: string[],

}

function buildSelectTopQueries(options: STQOptions): STQResults {
  const filters = options.filters
  const orderBy = options.orderBy
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
    FROM ${wrapIdentifier(options.schema)}.${wrapIdentifier(options.table)}
    ${filterString}
  `
  // This comes from this PR, it provides approximate counts for PSQL
  // https://github.com/beekeeper-studio/beekeeper-studio/issues/311#issuecomment-788325650
  // however not using the complex query, just the simple one from the psql docs
  // https://wiki.postgresql.org/wiki/Count_estimate
  // however it doesn't work in redshift or cockroach.
  const tuplesQuery = `

  SELECT
    reltuples as total
  FROM
    pg_class
  where
      oid = '${wrapIdentifier(options.schema)}.${wrapIdentifier(options.table)}'::regclass
  `

  // if we're not filtering data we want the optimized approximation of row count
  // rather than a legit row count.
  let countQuery = options.version.isPostgres && !filters && !options.forceSlow ? tuplesQuery : `SELECT count(*) as total ${baseSQL}`
  if (options.version.isRedshift && !filters) {
    countQuery = `SELECT COUNT(*) as total ${baseSQL}`
  }

  const query = `
    SELECT * ${baseSQL}
    ${orderByString}
    ${_.isNumber(options.limit) ? `LIMIT ${options.limit}` : ''}
    ${_.isNumber(options.offset) ? `OFFSET ${options.offset}` : ''}
    `
  return {
    query, countQuery, params
  }
}

async function getTableLength(conn: HasPool, table: string, schema: string): Promise<number> {
  const version = await getVersion(conn)
  const tableType = await getEntityType(conn, table, schema)
  const forceSlow = !tableType || tableType !== 'BASE_TABLE'
  const { countQuery, params } = buildSelectTopQueries({ table, schema, filters: undefined, version, forceSlow})
  const countResults = await driverExecuteSingle(conn, { query: countQuery, params: params })
  const rowWithTotal = countResults.rows.find((row: any) => { return row.total })
  const totalRecords = rowWithTotal ? rowWithTotal.total : 0
  return totalRecords
}

async function getEntityType(
  conn: HasPool,
  table: string,
  schema: string
): Promise<string | null> {
  const query = `
    select table_type as tt from information_schema.tables
    where table_name = $1 and table_schema = $2
    `
  const result = await driverExecuteSingle(conn, { query, params: [table, schema]})
  return result.rows[0]? result.rows[0]['tt'] : null
}


async function selectTop(
  conn: HasPool,
  table: string,
  offset: number,
  limit: number,
  orderBy: OrderBy[],
  filters: TableFilter[] | string,
  schema = 'public'
): Promise<TableResult> {

  const version = await getVersion(conn)
  version.isPostgres
  const qs = buildSelectTopQueries({
    table, offset, limit, orderBy, filters, schema, version
  })
  const result = await driverExecuteSingle(conn, { query: qs.query, params: qs.params })

  return {
    result: result.rows,
    fields: result.fields.map(f => f.name)
  }
}

async function selectTopStream(
  conn: HasPool,
  database: string,
  table: string,
  orderBy: OrderBy[],
  filters: TableFilter[] | string,
  chunkSize: number,
  schema: string
): Promise<StreamResults> {
  const version = await getVersion(conn)
  const qs = buildSelectTopQueries({
    table, orderBy, filters, version, schema
  })
  // const cursor = new Cursor(qs.query, qs.params)
  const countResults = await driverExecuteSingle(conn, {query: qs.countQuery, params: qs.params})
  const rowWithTotal = countResults.rows.find((row: any) => { return row.total })
  const totalRecords = rowWithTotal ? Number(rowWithTotal.total) : 0
  const columns = await listTableColumns(conn, database, table, schema)

  const cursorOpts = {
    query: qs.query,
    params: qs.params,
    conn: conn,
    chunkSize
  }

  return {
    totalRows: totalRecords,
    columns,
    cursor: new PsqlCursor(cursorOpts)
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
      entityType: 'routine',
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

export async function listTableColumns(
  conn: HasPool,
  _database: string,
  table?: string,
  schema?: string
): Promise<ExtendedTableColumn[]> {
  // if you provide table, you have to provide schema
  const clause = table ? "WHERE table_schema = $1 AND table_name = $2" : ""
  const params = table ? [schema, table] : []
  if (table && !schema) {
    throw new Error(`Table '${table}' provided for listTableColumns, but no schema name`)
  }

  const sql = `
    SELECT
      table_schema,
      table_name,
      column_name,
      is_nullable,
      ordinal_position,
      column_default,
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
    nullable: row.is_nullable === 'YES',
    defaultValue: row.column_default,
    ordinalPosition: Number(row.ordinal_position),
  }));
}

export async function listMaterializedViewColumns(conn: Conn, _database: string, table: string, schema: string) {
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


export async function listTableTriggers(conn: HasPool, table: string, schema: string) {

  const version = await getVersion(conn)

  // unsupported https://www.cockroachlabs.com/docs/stable/sql-feature-support.html

  if (version.isCockroach) return []
  // action_timing has taken over from condition_timing
  // this way we try both, and take the one that works.
  const timing_columns = ['action_timing', 'condition_timing']
  // const timing_column = 'action_timing'
  const sequels = timing_columns.map((c) => `
    SELECT
      trigger_name,
      ${c} as timing,
      event_manipulation as manipulation,
      action_statement as action,
      action_condition as condition
    FROM information_schema.triggers
    WHERE event_object_schema = $1
    AND event_object_table = $2
  `)
  const params = [
    schema,
    table,
  ];
  const promises = sequels.map((sql) => {
    return driverExecuteSingle(conn, { query: sql, params });
  })

  const data = await Promise.any(promises)

  return data.rows.map((row) => ({
    name: row.trigger_name,
    timing: row.timing,
    manipulation: row.manipulation,
    action: row.action,
    condition: row.condition,
    table: table,
    schema: schema
  }));
}


async function listCockroachIndexes(conn: Conn, table: string, schema: string): Promise<TableIndex[]> {
  const sql = `
   show indexes from ${tableName(table, schema)};
  `

  const result = await driverExecuteSingle(conn, { query: sql })
  const grouped = _.groupBy(result.rows, 'index_name')
  return Object.keys(grouped).map((indexName: string, idx) => {
    const columns = grouped[indexName].filter((c) => !c.implicit)
    const first: any = grouped[indexName][0]
    return {
      id: idx.toString(),
      name: indexName,
      table: table,
      schema: schema,
      // v21.2 onwards changes index names for primary keys
      primary: first.index_name === 'primary' || first.index_name.endsWith('pkey'),
      unique: !first.non_unique,
      columns: _.sortBy(columns, ['seq_in_index']).map((c: any) => ({
        name: c.column_name,
        order: c.direction
      }))

    }
  })

}


export async function listTableIndexes(
  conn: HasPool, table: string, schema: string
  ): Promise<TableIndex[]> {

  const version = await getVersion(conn)
  if (version.isCockroach) return await listCockroachIndexes(conn, table, schema)

  const sql = `
  SELECT i.indexrelid::regclass AS indexname,
      k.i AS index_order,
      i.indexrelid as id,
      i.indisunique,
      i.indisprimary,
      coalesce(a.attname,
                (('{' || pg_get_expr(
                            i.indexprs,
                            i.indrelid
                        )
                      || '}')::text[]
                )[k.i]
              ) AS index_column,
      i.indoption[k.i - 1] = 0 AS ascending
    FROM pg_index i
      CROSS JOIN LATERAL (SELECT unnest(i.indkey), generate_subscripts(i.indkey, 1) + 1) AS k(attnum, i)
      LEFT JOIN pg_attribute AS a
          ON i.indrelid = a.attrelid AND k.attnum = a.attnum
      JOIN pg_class t on t.oid = i.indrelid
      JOIN pg_namespace c on c.oid = t.relnamespace
    WHERE
    c.nspname = $1 AND
    t.relname = $2

`
  const params = [
    schema,
    table,
  ];

  const data = await driverExecuteSingle(conn, { query: sql, params });



  const grouped = _.groupBy(data.rows, 'indexname')

  const result = Object.keys(grouped).map((indexName) => {
    const blob = grouped[indexName]
    const unique = blob[0].indisunique
    const id = blob[0].id
    const primary = blob[0].indisprimary
    const columns: IndexedColumn[] = _.sortBy(blob, 'index_order').map((b) => {
      return {
        name: b.index_column,
        order: b.ascending ? 'ASC' : 'DESC'
      }
    })
    const item: TableIndex = {
      table, schema,
      id,
      name: indexName,
      unique,
      primary,
      columns
    }
    return item
  })

  return result
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

function wrapTable(table: string, schema?: string) {
  if (!schema) return wrapIdentifier(table)
  return `${wrapIdentifier(schema)}.${wrapIdentifier(table)}`
}

async function getTableOwner(conn: HasPool, table: string, schema: string) {
  const sql = `select tableowner from pg_catalog.pg_tables where tablename = $1 and schemaname = $2`
  const result = await driverExecuteSingle(conn, { query: sql, params: [table, schema]})
  return result.rows[0]?.tableowner
}


export async function getTablePropertiesRedshift() {
  return null
}

export async function getTableProperties(conn: HasPool, table: string, schema: string) {
  const version = await getVersion(conn)
  if (version.isRedshift) {
    return getTablePropertiesRedshift()
  }
  const identifier = wrapTable(table, schema)





  const statements = [
    `pg_indexes_size('${identifier}') as index_size`,
      `pg_relation_size('${identifier}') as table_size`,
      `obj_description('${identifier}'::regclass) as description`
  ]

  if (version.isPostgres && version.number < 90000) {
    statements[0] = `0 as index_size`
  }

  const sql = `SELECT ${statements.join(",")}`

  const detailsPromise =  version.isPostgres ? driverExecuteSingle(conn, { query: sql }) :
    Promise.resolve({ rows:[]})

  const triggersPromise = version.isPostgres ? listTableTriggers(conn, table, schema) : Promise.resolve([])

  const [
    result,
    indexes,
    relations,
    triggers,
    owner
  ] = await Promise.all([
    detailsPromise,
    listTableIndexes(conn, table, schema),
    getTableKeys(conn, "", table, schema),
    triggersPromise,
    getTableOwner(conn, table, schema)
  ])

  const props = result.rows.length > 0 ? result.rows[0] : {}
  return {
    description: props.description,
    indexSize: Number(props.index_size),
    size: Number(props.table_size),
    indexes,
    relations,
    triggers,
    owner
  }

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

export async function getTableKeys(conn: Conn, _database: string, table: string, schema: string): Promise<TableKey[]> {
  const sql = `
    SELECT
        tc.table_schema as from_schema,
        tc.table_name as from_table,
        kcu.column_name as from_column,
        ccu.table_schema AS to_schema,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column,
        tc.constraint_name,
        rc.update_rule as update_rule,
        rc.delete_rule as delete_rule
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
         JOIN information_schema.referential_constraints rc
          on tc.constraint_name = rc.constraint_name
          and tc.table_schema = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name= $1 and tc.table_schema = $2;

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
    onUpdate: row.update_rule,
    onDelete: row.delete_rule
  }));
}

export async function getPrimaryKey(conn: HasPool, _database: string, table: string, schema: string): Promise<string | null> {
  const keys = await getPrimaryKeys(conn, _database, table, schema)
  return keys.length === 1 ? keys[0].columnName : null
}

export async function getPrimaryKeys(conn: HasPool, _database: string, table: string, schema: string): Promise<PrimaryKeyColumn[]> {
  const version = await getVersion(conn)
  const tablename = PD.escapeString(tableName(table, schema), true)
  const psqlQuery = `
    SELECT
      a.attname as column_name,
      format_type(a.atttypid, a.atttypmod) AS data_type,
      a.attnum as position
    FROM   pg_index i
    JOIN   pg_attribute a ON a.attrelid = i.indrelid
                        AND a.attnum = ANY(i.indkey)
    WHERE  i.indrelid = ${tablename}::regclass
    AND    i.indisprimary
    ORDER BY a.attnum
  `

  const redshiftQuery = `
    select tco.constraint_schema,
          tco.constraint_name,
          kcu.ordinal_position as position,
          kcu.column_name as column_name,
          kcu.table_schema,
          kcu.table_name
    from information_schema.table_constraints tco
    join information_schema.key_column_usage kcu
        on kcu.constraint_name = tco.constraint_name
        and kcu.constraint_schema = tco.constraint_schema
        and kcu.constraint_name = tco.constraint_name
    where tco.constraint_type = 'PRIMARY KEY'
    ${schema ? `and kcu.table_schema = '${escapeString(schema)}'` : ''}
    and kcu.table_name = '${escapeString(table)}'
    order by tco.constraint_schema,
            tco.constraint_name,
            kcu.ordinal_position;
  `
  const query = version.isRedshift ? redshiftQuery : psqlQuery
  const data = await driverExecuteSingle(conn, { query })
  if (data.rows) {
    return data.rows.map((r) => ({
      columnName: r.column_name,
      position: r.position
    }))
  } else {
    return []
  }
}

export async function applyChanges(conn: Conn, changes: TableChanges): Promise<TableUpdateResult[]> {
  let results: TableUpdateResult[] = []

  await runWithConnection(conn, async (connection) => {
    const cli = { connection }
    await driverExecuteQuery(cli, { query: 'BEGIN' })

    try {
      if (changes.inserts) {
        await insertRows(cli, changes.inserts)
      }

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

// this allows us to test without a valid connection
async function Builder(conn?: HasPool) {
  if (!conn) return PostgresqlChangeBuilder
  const v = await getVersion(conn)
  return v.isRedshift ? RedshiftChangeBuilder : PostgresqlChangeBuilder
}

export async function alterTableSql(conn: HasPool, change: AlterTableSpec): Promise<string> {
  const Cls = await Builder(conn)
  const builder = new Cls(change.table, change.schema)
  return builder.alterTable(change)
}

export async function alterTable(_conn: HasPool, change: AlterTableSpec) {
  const version = await getVersion(_conn)

  await runWithConnection(_conn, async (connection) => {

    const cli = { connection }
    const sql = await alterTableSql(_conn, change)
    // redshift doesn't support alter table within transactions.
    const transaction = !version.isRedshift && change.alterations?.length
    try {
      if (transaction) await driverExecuteQuery(cli, { query: 'BEGIN' })
      await driverExecuteQuery(cli, { query: sql })
      if (transaction) await driverExecuteQuery(cli, { query: 'COMMIT' })
    } catch (ex) {
      log.error("ALTERTABLE", ex)
      if (transaction) await driverExecuteQuery(cli, { query: 'ROLLBACK'})
      throw ex
    }
  })
}

export function alterIndexSql(payload: IndexAlterations): string | null {
  const { table, schema, additions, drops } = payload
  const changeBuilder = new PostgresqlChangeBuilder(table, schema)
  const newIndexes = changeBuilder.createIndexes(additions)
  const droppers = changeBuilder.dropIndexes(drops)
  return [newIndexes, droppers].filter((f) => !!f).join(";")
}

export async function alterIndex(conn: HasPool, payload: IndexAlterations) {
  const sql = alterIndexSql(payload);
  await executeWithTransaction(conn, { query: sql });
}


export function alterRelationSql(payload: RelationAlterations): string {
  const { table, schema } = payload
  const builder = new PostgresqlChangeBuilder(table, schema)
  const creates = builder.createRelations(payload.additions)
  const drops = builder.dropRelations(payload.drops)
  return [creates, drops].filter((f) => !!f).join(";")
}

export async function alterRelation(conn, payload: RelationAlterations): Promise<void> {
  const query = alterRelationSql(payload)
  await executeWithTransaction(conn, { query });
}


export async function setTableDescription(conn: HasPool, table: string, description: string, schema: string): Promise<string> {
  const identifier = wrapTable(table, schema)
  const comment  = escapeString(description)
  const sql = `COMMENT ON TABLE ${identifier} IS '${comment}'`
  await driverExecuteSingle(conn, { query: sql})
  const result = await getTableProperties(conn, table, schema)
  return result?.description
}

async function insertRows(cli: any, rawInserts: TableInsert[]) {
  const columnsList = await Promise.all(rawInserts.map((insert) => {
    return listTableColumns(cli, null, insert.table, insert.schema)
  }))

  const fixedInserts = rawInserts.map((insert, idx) => {
    const result = { ...insert}
    const columns = columnsList[idx]
    result.data = result.data.map((obj) => {
      return _.mapValues(obj, (value, key) => {
        const column = columns.find((c) => c.columnName === key)
        if (column && column.dataType.startsWith('_')) {
          return JSON.parse(value)
        } else {
          return value
        }
      })
    })
    return result
  })
  await driverExecuteQuery(cli, { query: buildInsertQueries(knex, fixedInserts).join(";") })

  return true
}

async function updateValues(cli: any, rawUpdates: TableUpdate[]): Promise<TableUpdateResult[]> {

  // If a type starts with an underscore - it's an array
  // so we need to turn the string representation back to an array
  // if a type is BYTEA, decodes BASE64 URL encoded to hex
  const updates = rawUpdates.map((update) => {
    const result = { ...update}
    if (update.columnType?.startsWith('_')) {
      result.value = JSON.parse(update.value)
    } else if (update.columnType === 'bytea' && update.value) {
        result.value = '\\x' + base64.decode(update.value, 'hex')
    }
    return result
  })
  log.info("applying updates", updates)
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

export function query(conn: Conn, queryText: string, _schema: string) {
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

export async function getInsertQuery(conn: HasPool, database: string, tableInsert: TableInsert): Promise<string> {
  const columns = await listTableColumns(conn, database, tableInsert.table, tableInsert.schema)
  return buildInsertQuery(knex, tableInsert, columns)
}

export function getQuerySelectTop(_conn: Conn, table: string, limit: number, schema: string) {
  return `SELECT * FROM ${wrapIdentifier(schema)}.${wrapIdentifier(table)} LIMIT ${limit}`;
}

export async function getTableCreateScript(conn: Conn, table: string, schema: string): Promise<string> {
  // Reference http://stackoverflow.com/a/32885178
  const sql = `
    SELECT
      'CREATE TABLE ' || quote_ident(tabdef.schema_name) || '.' || quote_ident(tabdef.table_name) || E' (\n' ||
      array_to_string(
        array_agg(
          '  ' || quote_ident(tabdef.column_name) || ' ' ||
          case when tabdef.def_val like 'nextval(%_seq%' then
            case when tabdef.type = 'integer' then 'serial'
                 when tabdef.type = 'smallint' then 'smallserial'
                 when tabdef.type = 'bigint' then 'bigserial'
                 else tabdef.type end
          else
            tabdef.type
          end || ' ' ||
          tabdef.not_null ||
          CASE WHEN tabdef.def_val IS NOT NULL
                    AND NOT (tabdef.def_val like 'nextval(%_seq%'
                             AND (tabdef.type = 'integer' OR tabdef.type = 'smallint' OR tabdef.type = 'bigint'))
               THEN ' DEFAULT ' || tabdef.def_val
          ELSE '' END ||
          CASE WHEN tabdef.identity IS NOT NULL THEN ' ' || tabdef.identity ELSE '' END
          ORDER BY tabdef.column_idx ASC
        )
        , E',\n'
      ) || E'\n);\n' ||
      CASE WHEN tc.constraint_name IS NULL THEN ''
           ELSE E'\nALTER TABLE ' || quote_ident(tabdef.schema_name) || '.' || quote_ident(tabdef.table_name) ||
           ' ADD CONSTRAINT ' || quote_ident(tc.constraint_name)  ||
           ' PRIMARY KEY ' || '(' || substring(constr.column_name from 0 for char_length(constr.column_name)-1) || ')'
      END AS createtable
    FROM
    ( SELECT
        c.relname AS table_name,
        a.attname AS column_name,
        a.attnum AS column_idx,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
        CASE
          WHEN a.attnotnull OR a.attidentity != '' THEN 'NOT NULL'
        ELSE 'NULL'
        END AS not_null,
        CASE WHEN a.atthasdef THEN pg_catalog.pg_get_expr(ad.adbin, ad.adrelid) ELSE null END AS def_val,
        CASE WHEN a.attidentity = 'a' THEN 'GENERATED ALWAYS AS IDENTITY' when a.attidentity = 'd' THEN 'GENERATED BY DEFAULT AS IDENTITY' ELSE null END AS identity,
        n.nspname as schema_name
      FROM pg_class c
       JOIN pg_namespace n ON (n.oid = c.relnamespace)
       JOIN pg_attribute a ON (a.attnum > 0 AND a.attrelid = c.oid)
       JOIN pg_type t ON (a.atttypid = t.oid)
       LEFT JOIN pg_attrdef ad ON (a.attrelid = ad.adrelid AND a.attnum = ad.adnum)
      WHERE c.relname = $1
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

  return data.rows.map((row) => row.createtable)[0];
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
  return `"${value.replaceAll(/"/g, '""')}"`;
}

async function getSchema(conn: Conn) {
  const sql = 'SELECT CURRENT_SCHEMA() AS schema';

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

  let optionsString = undefined
  if (server.config.client === 'cockroachdb') {
    const cluster = server.config.options?.cluster || undefined
    if (cluster) {
      optionsString = `--cluster=${cluster}`
    }
  }

  const config: PoolConfig = {
    host: server.config.host,
    port: server.config.port || undefined,
    password: server.config.password || undefined,
    database: database.database,
    max: 5, // max idle connections per time (30 secs)
    connectionTimeoutMillis: globals.psqlTimeout,
    idleTimeoutMillis: globals.psqlIdleTimeout,
    // not in the typings, but works.
    // @ts-ignore
    options: optionsString
  };

  if (server.config.user) {
    config.user = server.config.user
  } else if (server.config.osUser) {
    config.user = server.config.osUser
  }

  if(server.config.socketPathEnabled) {
    config.host = server.config.socketPath;
    config.port = null;
    return config;
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
  const rowCount = data.rowCount || data.rows?.length || 0
  return {
    command: command || data.command,
    rows: rowResults ? data.rows.map(r => _.zipObject(fieldIds, r)) : data.rows,
    fields: fields,
    rowCount: rowCount,
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

async function executeWithTransaction(conn: Conn | HasConnection, queryArgs: PostgresQueryArgs): Promise<QueryResult[]> {
  const fullQuery = joinQueries([
    'BEGIN', queryArgs.query, 'COMMIT'
  ])
  return await runWithConnection(conn, async (connection) => {
    const cli = { connection }
    try {
      return await driverExecuteQuery(cli, { ...queryArgs, query: fullQuery})
    } catch (ex) {
      log.error("executeWithTransaction", ex)
      await driverExecuteSingle(cli, { query: "ROLLBACK" })
      throw ex;
    }
  })
}

function driverExecuteQuery(conn: Conn | HasConnection, queryArgs: PostgresQueryArgs): Promise<QueryResult[]> {

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
      log.info('RUNNING', queryArgs.query, queryArgs.params)
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
  parseRowQueryResult,
  alterTableSql
}
