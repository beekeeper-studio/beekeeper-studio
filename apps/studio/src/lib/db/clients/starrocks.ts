import { MysqlClient } from "./mysql";
import { FilterOptions, PrimaryKeyColumn, Routine, TableChanges } from "../models";
import { IDbConnectionDatabase } from "../types";
import { IDbConnectionServer } from "../backendTypes";
import knexlib from "knex";
import Client_StarRocks from "@/shared/lib/knex-starrocks";

export class StarRocksClient extends MysqlClient {
  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(server, database);
    this.knex = knexlib({ client: Client_StarRocks });
  }

  // StarRocks' SQL transactions are too limited to wrap applyChanges in one transaction
  // Ref: https://docs.starrocks.io/docs/loading/SQL_transaction/#usage-notes
  async executeApplyChanges(changes: TableChanges): Promise<any[]> {
    return this.runWithConnection(this.applyChangesRunner.bind(this, changes));
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
