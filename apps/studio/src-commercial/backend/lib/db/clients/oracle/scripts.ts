// One row per foreign-key column, in the shape BasicDatabaseClient.parseForeignKeyRow
// expects. Callers append the WHERE / ORDER BY.
// Oracle returns column names in upper case (OracleClient.parseForeignKeyRow
// lowercases them) and has no ON UPDATE action for foreign keys.
// https://stackoverflow.com/questions/1729996/list-of-foreign-keys-and-the-tables-they-reference-in-oracle-db
export const foreignKeyColumnsSql = `
  SELECT
    a.constraint_name,
    a.owner AS from_schema,
    a.table_name AS from_table,
    a.column_name AS from_column,
    c_pk.owner AS to_schema,
    c_pk.table_name AS to_table,
    r_a.column_name AS to_column,
    a.position AS ordinal_position,
    c.delete_rule AS on_delete
  FROM all_cons_columns a
    JOIN all_constraints c
      ON a.owner = c.owner AND a.constraint_name = c.constraint_name
    JOIN all_constraints c_pk
      ON c.r_owner = c_pk.owner AND c.r_constraint_name = c_pk.constraint_name
    JOIN all_cons_columns r_a
      ON c_pk.owner = r_a.owner
      AND c_pk.constraint_name = r_a.constraint_name
      AND r_a.position = a.position
  WHERE c.constraint_type = 'R'
    AND c_pk.constraint_type IN ('P', 'U')
`;
