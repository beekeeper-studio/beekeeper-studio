// One row per foreign-key column, in the shape BasicDatabaseClient.parseForeignKeyRow
// expects. Callers append the WHERE / ORDER BY.
// BigQuery datasets stand in for schemas and tables are listed without one,
// so no schema columns are selected; foreign keys there carry no referential
// actions either. `dataset` must already be wrapped as an identifier.
//
// TODO: CONSTRAINT_COLUMN_USAGE carries no ordinal position, so the
// referenced columns of a composite key cannot be paired with the
// referencing ones here. Composite keys are disabled for this dialect.
export function foreignKeyColumnsSql(dataset: string): string {
  return `
    SELECT
      f.constraint_name,
      f.table_name AS from_table,
      f.column_name AS from_column,
      f.ordinal_position,
      t.table_name AS to_table,
      t.column_name AS to_column
    FROM ${dataset}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS f
    JOIN ${dataset}.INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE AS t
      ON f.constraint_name = t.constraint_name
    JOIN ${dataset}.INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS con
      ON f.constraint_catalog = con.constraint_catalog
      AND f.constraint_schema = con.constraint_schema
      AND f.constraint_name = con.constraint_name
  `;
}
