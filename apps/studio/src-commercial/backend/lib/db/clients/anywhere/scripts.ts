// One row per foreign-key column, in the shape BasicDatabaseClient.parseForeignKeyRow
// expects. Callers append the WHERE / ORDER BY.
// SYSFKEY has no constraint names or referential actions, so the key is
// identified by its table pair and the actions default to NO ACTION.
export const foreignKeyColumnsSql = `
  SELECT
    CAST(fk.foreign_table_id AS VARCHAR) + '_' + CAST(fk.primary_table_id AS VARCHAR) AS constraint_name,
    u_for.user_name AS from_schema,
    t_for.table_name AS from_table,
    c_for.column_name AS from_column,
    u_pri.user_name AS to_schema,
    t_pri.table_name AS to_table,
    c_pri.column_name AS to_column,
    ic_for.sequence AS ordinal_position,
    'NO ACTION' AS on_update,
    'NO ACTION' AS on_delete
  FROM SYS.SYSFKEY fk
    JOIN SYS.SYSIDXCOL ic_for ON fk.foreign_index_id = ic_for.index_id AND ic_for.table_id = fk.foreign_table_id
    JOIN SYS.SYSCOLUMN c_for ON ic_for.table_id = c_for.table_id AND ic_for.column_id = c_for.column_id
    JOIN SYS.SYSTABLE t_for ON fk.foreign_table_id = t_for.table_id
    JOIN SYS.SYSUSER u_for ON t_for.creator = u_for.user_id
    JOIN SYS.SYSIDXCOL ic_pri ON fk.primary_index_id = ic_pri.index_id AND ic_pri.table_id = fk.primary_table_id
    JOIN SYS.SYSCOLUMN c_pri ON ic_pri.table_id = c_pri.table_id AND ic_pri.column_id = c_pri.column_id
    JOIN SYS.SYSTABLE t_pri ON fk.primary_table_id = t_pri.table_id
    JOIN SYS.SYSUSER u_pri ON t_pri.creator = u_pri.user_id
  WHERE ic_for.sequence = ic_pri.sequence
`;
