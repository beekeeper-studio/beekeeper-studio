// One row per foreign-key column, in the shape BasicDatabaseClient.parseForeignKeyRow
// expects. Callers append the WHERE / ORDER BY.
export const foreignKeyColumnsSql = `
  SELECT
    kcu1.constraint_name,
    kcu1.constraint_schema AS from_schema,
    kcu1.table_name AS from_table,
    kcu1.column_name AS from_column,
    kcu1.ordinal_position,
    kcu2.constraint_schema AS to_schema,
    kcu2.table_name AS to_table,
    kcu2.column_name AS to_column,
    rc.update_rule AS on_update,
    rc.delete_rule AS on_delete
  FROM information_schema.key_column_usage AS kcu1
    JOIN information_schema.referential_constraints AS rc
      ON kcu1.constraint_name = rc.constraint_name
      AND kcu1.constraint_schema = rc.constraint_schema
    JOIN information_schema.key_column_usage AS kcu2
      ON kcu2.constraint_name = rc.unique_constraint_name
      AND kcu2.constraint_schema = rc.unique_constraint_schema
      AND kcu2.ordinal_position = kcu1.ordinal_position
`;
