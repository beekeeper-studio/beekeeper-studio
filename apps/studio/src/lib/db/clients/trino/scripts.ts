/**
 * Utility functions for the Trino client
 */

import { FilterOptions, OrderBy, TableFilter } from "../../models";

/**
 * Generates a SQL SELECT query for Trino with the given options
 */
export function generateSelectTopSql(
  table: string,
  schema: string,
  offset: number,
  limit: number,
  orderBy: OrderBy[] = [],
  filters?: string | TableFilter[],
  selects?: string[]
): string {
  const selectClause = selects && selects.length > 0 ? selects.join(', ') : '*';
  
  let query = `SELECT ${selectClause} FROM "${schema}"."${table}"`;
  
  // Add WHERE clause if filters are provided
  if (filters && (typeof filters === 'string' || filters.length > 0)) {
    query += ` WHERE ${typeof filters === 'string' ? filters : '1=1'}`; // Simplified
  }
  
  // Add ORDER BY clause if orderBy is provided
  if (orderBy && orderBy.length > 0) {
    const orderClauses = orderBy.map(ord => `"${ord.field}" ${ord.dir}`);
    query += ` ORDER BY ${orderClauses.join(', ')}`;
  }
  
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  
  return query;
}

/**
 * Generates a SQL query to get the version of the Trino server
 */
export function generateVersionQuery(): string {
  return `SELECT 
  node_version as version 
  FROM system.runtime.nodes 
  LIMIT 1`;
}

/**
 * Generates a SQL query to list tables with optional filtering
 */
export function generateListTablesQuery(filter?: FilterOptions): string {
  const schema = filter?.schema || 'default';
  const catalog = filter?.catalog || 'default';
  
  return `
  SELECT 
    table_name as name, 
    table_schema as schema,
    table_catalog as catalog
  FROM information_schema.tables
  WHERE table_schema = '${schema}'
    AND table_catalog = '${catalog}'
    AND table_type = 'BASE TABLE'
  `;
}

/**
 * Generates a SQL query to list views with optional filtering
 */
export function generateListViewsQuery(filter?: FilterOptions): string {
  const schema = filter?.schema || 'default';
  const catalog = filter?.catalog || 'default';
  
  return `
  SELECT 
    table_name as name, 
    table_schema as schema,
    table_catalog as catalog
  FROM information_schema.tables
  WHERE table_schema = '${schema}'
    AND table_catalog = '${catalog}'
    AND table_type = 'VIEW'
  `;
}

/**
 * Generates a SQL query to list columns for a table
 */
export function generateListColumnsQuery(table: string, schema: string, catalog?: string): string {
  return `
  SELECT 
    column_name as columnName,
    data_type as dataType,
    column_default as defaultValue,
    is_nullable as isNullable,
    comment
  FROM information_schema.columns
  WHERE table_name = '${table}'
    AND table_schema = '${schema}'
    ${catalog ? `AND table_catalog = '${catalog}'` : ''}
  ORDER BY ordinal_position
  `;
}

/**
 * Generates a SQL query to list available catalogs
 */
export function generateListCatalogsQuery(): string {
  return `SELECT catalog_name FROM information_schema.catalogs`;
}

/**
 * Generates a SQL query to list schemas in a catalog
 */
export function generateListSchemasQuery(catalog?: string): string {
  if (catalog) {
    return `
    SELECT schema_name 
    FROM information_schema.schemata
    WHERE catalog_name = '${catalog}'
    `;
  }
  
  return `SELECT schema_name FROM information_schema.schemata`;
}

/**
 * Generates a SQL query to count rows in a table
 */
export function generateCountQuery(table: string, schema: string): string {
  return `SELECT COUNT(*) as count FROM "${schema}"."${table}"`;
}