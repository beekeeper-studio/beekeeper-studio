// One row per foreign-key column, in the shape BasicDatabaseClient.parseForeignKeyRow
// expects. Callers append the WHERE / ORDER BY.
// The sys views spell referential actions with underscores (NO_ACTION,
// SET_NULL); they are reported with spaces to match INFORMATION_SCHEMA and
// the other drivers.
export const foreignKeyColumnsSql = `
  SELECT
    fk.name AS constraint_name,
    SCHEMA_NAME(pt.schema_id) AS from_schema,
    pt.name AS from_table,
    pc.name AS from_column,
    SCHEMA_NAME(rt.schema_id) AS to_schema,
    rt.name AS to_table,
    rc.name AS to_column,
    fkc.constraint_column_id AS ordinal_position,
    REPLACE(fk.update_referential_action_desc, '_', ' ') AS on_update,
    REPLACE(fk.delete_referential_action_desc, '_', ' ') AS on_delete
  FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    JOIN sys.tables pt ON pt.object_id = fk.parent_object_id
    JOIN sys.columns pc ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id
    JOIN sys.tables rt ON rt.object_id = fk.referenced_object_id
    JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
`;
