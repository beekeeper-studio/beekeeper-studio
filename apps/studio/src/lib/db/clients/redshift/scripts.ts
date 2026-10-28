// One row per foreign-key column, in the shape BasicDatabaseClient.parseForeignKeyRow
// expects. Callers append further `AND` conditions and the ORDER BY.
//
// Redshift's information_schema dates from PostgreSQL 8.0: key_column_usage
// has no position_in_unique_constraint, so the referenced columns of a key
// can't be paired with the referencing ones there. pg_constraint lists both
// sides in order (conkey / confkey), so the n-th entries of each are paired.
// Redshift has no unnest or generate_subscripts, so positions come from a
// fixed series, like PostgreSQL 8.0's own key_column_usage view. 32 is
// PostgreSQL's limit on key columns.
//
// Tables are matched by oid, not by constraint name, so constraints that
// share a name across schemas (`orders_pkey` in two schemas) don't collide.
export const foreignKeyColumnsSql = `
  SELECT
    con.conname AS constraint_name,
    from_ns.nspname AS from_schema,
    from_tbl.relname AS from_table,
    from_col.attname AS from_column,
    to_ns.nspname AS to_schema,
    to_tbl.relname AS to_table,
    to_col.attname AS to_column,
    pos.n AS ordinal_position,
    CASE con.confupdtype
      WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
    END AS on_update,
    CASE con.confdeltype
      WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
    END AS on_delete
  FROM pg_catalog.pg_constraint AS con
    JOIN pg_catalog.pg_class AS from_tbl ON from_tbl.oid = con.conrelid
    JOIN pg_catalog.pg_namespace AS from_ns ON from_ns.oid = from_tbl.relnamespace
    JOIN pg_catalog.pg_class AS to_tbl ON to_tbl.oid = con.confrelid
    JOIN pg_catalog.pg_namespace AS to_ns ON to_ns.oid = to_tbl.relnamespace
    CROSS JOIN generate_series(1, 32) AS pos(n)
    JOIN pg_catalog.pg_attribute AS from_col
      ON from_col.attrelid = con.conrelid AND from_col.attnum = con.conkey[pos.n]
    JOIN pg_catalog.pg_attribute AS to_col
      ON to_col.attrelid = con.confrelid AND to_col.attnum = con.confkey[pos.n]
  WHERE con.contype = 'f'
    AND from_ns.nspname NOT LIKE 'pg_%'
`;
