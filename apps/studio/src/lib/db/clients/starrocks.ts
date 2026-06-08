import mysql from "mysql2";
import { MysqlClient } from "./mysql";
import { FilterOptions, PrimaryKeyColumn, Routine } from "../models";

export class StarRocksClient extends MysqlClient {
  // StarRocks forbids reading a table that was modified earlier in the same
  // explicit transaction, so read updated rows in a separate statement.
  protected readUpdatedRowsBeforeCommit = false;

  // StarRocks' transaction support is limited: it rejects modifying a table and
  // then reading or further modifying it within the same explicit transaction
  // (and several DML patterns fail inside START TRANSACTION outright). Run
  // "transactional" work in autocommit, where each statement commits on its own.
  async runWithTransaction<T>(
    func: (c: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    return this.runWithConnection(func);
  }

  // StarRocks (PRIMARY KEY model) does not expose primary keys via SHOW KEYS /
  // SHOW INDEX the way MySQL does — both return nothing.
  async getPrimaryKeys(
    table: string,
    schema?: string
  ): Promise<PrimaryKeyColumn[]> {
    const sql = `
      select column_name, ordinal_position
      from information_schema.columns
      where table_name = ?
        and table_schema = ${schema ? "?" : "database()"}
        and column_key = 'PRI'
      order by ordinal_position
    `;
    const params = schema ? [table, schema] : [table];
    const { rows } = await this.driverExecuteSingle(sql, { params });

    return rows.map((r) => ({
      columnName: r.column_name,
      position: r.ordinal_position,
    }));
  }

  // StarRocks' information_schema.routines lacks data_type/character_maximum_length
  // and it has no information_schema.parameters table, so query a minimal subset.
  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    const sql = `
      select
        r.specific_name as specific_name,
        r.routine_name as routine_name,
        r.routine_type as routine_type
      from information_schema.routines r
      where r.routine_schema not in ('sys', 'information_schema',
                                 'mysql', 'performance_schema')
      and r.routine_schema = database()
      order by r.specific_name
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((r) => ({
      id: r.specific_name,
      name: r.specific_name,
      returnType: null,
      returnTypeLength: undefined,
      entityType: "routine",
      type: r.routine_type ? r.routine_type.toLowerCase() : "function",
      routineParams: [],
    }));
  }
}
