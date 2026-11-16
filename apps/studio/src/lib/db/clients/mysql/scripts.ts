// One row per foreign-key column, in the shape BasicDatabaseClient.parseForeignKeyRow
// expects. Callers append the WHERE / ORDER BY.
// MySQL has no schema level below the database and tables are listed without
// one, so no schema columns are selected and both schema fields stay blank.
export const foreignKeyColumnsSql = `
  SELECT
    cu.constraint_name AS constraint_name,
    cu.table_name AS from_table,
    cu.column_name AS from_column,
    cu.referenced_table_name AS to_table,
    cu.referenced_column_name AS to_column,
    cu.ordinal_position AS ordinal_position,
    rc.update_rule AS on_update,
    rc.delete_rule AS on_delete
  FROM information_schema.key_column_usage cu
  JOIN information_schema.referential_constraints rc
    ON cu.constraint_name = rc.constraint_name
    AND cu.constraint_schema = rc.constraint_schema
`;
