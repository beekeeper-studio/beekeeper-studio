import mysql from "mysql2";
import { MysqlClient } from "./mysql";
import { FilterOptions, PrimaryKeyColumn, Routine, TableChanges } from "../models";

// StarRocks speaks the MySQL protocol and reports VERSION() as 8.0.33, so it
// reuses MysqlClient. Only the spots where StarRocks' information_schema
// diverges from MySQL are overridden here.
export class StarRocksClient extends MysqlClient {
  constructor(server, database) {
    super(server, database);
    this.dialect = 'mysql';
  }

  // StarRocks (PRIMARY KEY model) does not expose primary keys via SHOW KEYS /
  // SHOW INDEX the way MySQL does — both return nothing. The primary-key columns
  // are reported through information_schema.columns.column_key = 'PRI' instead.
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

  // StarRocks forbids reading a table that was modified earlier in the same
  // explicit transaction ("SELECT cannot read table ... modified earlier in the
  // same transaction"). updateValues() reads rows back after updating them, so
  // apply changes with autocommit instead of inside a single transaction.
  async executeApplyChanges(changes: TableChanges, tabId?: number): Promise<any[]> {
    let results = [];

    const run = async (connection: mysql.PoolConnection) => {
      if (changes.inserts) {
        await this.insertRows(changes.inserts, connection);
      }
      if (changes.updates) {
        results = await this.updateValues(changes.updates, connection);
      }
      if (changes.deletes) {
        await this.deleteRows(changes.deletes, connection);
      }
    };

    await this.runWithConnection(run, tabId);

    return results;
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
