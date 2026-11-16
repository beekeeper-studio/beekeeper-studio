// One row per foreign-key column, in the shape BasicDatabaseClient.parseForeignKeyRow
// expects. Callers append the WHERE / ORDER BY.
//
// TODO: the referenced table and column come from scalar subqueries, which
// fail for composite keys. Ordinal matching has not been verified against a
// live Redshift cluster yet.
export const foreignKeyColumnsSql = `
  SELECT
    tc.constraint_name,
    kcu.constraint_schema AS from_schema,
    kcu.table_name AS from_table,
    kcu.column_name AS from_column,
    rc.unique_constraint_schema AS to_schema,
    (SELECT kcu2.table_name
      FROM information_schema.key_column_usage AS kcu2
      WHERE kcu2.constraint_name = rc.unique_constraint_name) AS to_table,
    (SELECT kcu2.column_name
      FROM information_schema.key_column_usage AS kcu2
      WHERE kcu2.constraint_name = rc.unique_constraint_name) AS to_column,
    rc.update_rule AS on_update,
    rc.delete_rule AS on_delete
  FROM information_schema.key_column_usage AS kcu
    JOIN information_schema.table_constraints AS tc
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.table_schema NOT LIKE 'pg_%'
`;
