// One row per foreign-key column, in the shape BasicDatabaseClient.parseForeignKeyRow
// expects. Callers append the WHERE / ORDER BY.
// BigQuery datasets stand in for schemas and tables are listed without one,
// so no schema columns are selected; foreign keys there carry no referential
// actions either. `dataset` must already be wrapped as an identifier.
//
// CONSTRAINT_COLUMN_USAGE lists the referenced columns of a key without
// their order, so on its own it pairs every referencing column with every
// referenced one. A BigQuery foreign key always references the primary key,
// and KEY_COLUMN_USAGE.position_in_unique_constraint is the position of the
// referenced column in that key, so only the referenced column at that
// position of the primary key is kept.
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
    JOIN ${dataset}.INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS con
      ON f.constraint_catalog = con.constraint_catalog
      AND f.constraint_schema = con.constraint_schema
      AND f.constraint_name = con.constraint_name
      AND f.table_name = con.table_name
    JOIN ${dataset}.INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE AS t
      ON f.constraint_schema = t.constraint_schema
      AND f.constraint_name = t.constraint_name
    JOIN ${dataset}.INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS pk
      ON pk.table_schema = t.table_schema
      AND pk.table_name = t.table_name
      AND pk.constraint_type = 'PRIMARY KEY'
    JOIN ${dataset}.INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS pk_col
      ON pk_col.constraint_schema = pk.constraint_schema
      AND pk_col.constraint_name = pk.constraint_name
      AND pk_col.table_name = pk.table_name
      AND pk_col.column_name = t.column_name
      AND pk_col.ordinal_position = f.position_in_unique_constraint
  `;
}
