export interface ColumnSearchResult {
  schemaName: string
  tableName: string
  columnName: string
  dataType: string
}

export class ColumnSearchRequests {
  private sequence = 0

  invalidate(): void {
    this.sequence++
  }

  async run<T>(request: () => Promise<T>): Promise<T | undefined> {
    const sequence = ++this.sequence
    try {
      const result = await request()
      return sequence === this.sequence ? result : undefined
    } catch (error) {
      if (sequence === this.sequence) throw error
      return undefined
    }
  }
}

export function indexColumnResults(rows: ColumnSearchResult[]): Map<string, ColumnSearchResult[]> {
  const index = new Map<string, ColumnSearchResult[]>()
  const seen = new Set<string>()
  for (const row of rows) {
    const key = JSON.stringify([row.schemaName, row.tableName])
    const columnKey = JSON.stringify([row.schemaName, row.tableName, row.columnName])
    if (seen.has(columnKey)) continue
    seen.add(columnKey)
    if (!index.has(key)) index.set(key, [])
    index.get(key).push(row)
  }
  return index
}

export function matchColumnResults(rows: ColumnSearchResult[] | Map<string, ColumnSearchResult[]>, schema: string | undefined, table: string, database?: string): ColumnSearchResult[] {
  const index = Array.isArray(rows) ? indexColumnResults(rows) : rows
  return index.get(JSON.stringify([schema || database, table])) || []
}

export function buildColumnSearchQuery(dialect: string, term: string): string | null {
  if (!term || !['postgresql', 'mysql', 'mariadb'].includes(dialect)) return null
  const hex = Array.from(new TextEncoder().encode(term), byte => byte.toString(16).padStart(2, '0')).join('')
  if (dialect === 'postgresql') {
    return `
SELECT c.table_schema AS "schemaName", c.table_name AS "tableName",
       c.column_name AS "columnName",
       CASE WHEN c.data_type = 'USER-DEFINED' THEN COALESCE(c.domain_name, c.udt_name)
            ELSE c.data_type END AS "dataType"
FROM information_schema.columns c
WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND c.table_schema NOT LIKE 'pg_toast%'
  AND strpos(lower(c.column_name), lower(convert_from(decode('${hex}', 'hex'), 'UTF8'))) > 0
UNION ALL
SELECT n.nspname, rel.relname, a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod)
FROM pg_catalog.pg_class rel
JOIN pg_catalog.pg_namespace n ON n.oid = rel.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = rel.oid
WHERE rel.relkind = 'm' AND a.attnum > 0 AND NOT a.attisdropped
  AND has_column_privilege(rel.oid, a.attnum, 'SELECT')
  AND strpos(lower(a.attname), lower(convert_from(decode('${hex}', 'hex'), 'UTF8'))) > 0
ORDER BY 1, 2, 3`.trim()
  }
  return `
SELECT c.TABLE_SCHEMA AS schemaName, c.TABLE_NAME AS tableName,
       c.COLUMN_NAME AS columnName, c.COLUMN_TYPE AS dataType
FROM information_schema.COLUMNS c
WHERE c.TABLE_SCHEMA = DATABASE()
  AND LOCATE(LOWER(CONVERT(0x${hex} USING utf8mb4)), LOWER(c.COLUMN_NAME)) > 0
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION`.trim()
}
