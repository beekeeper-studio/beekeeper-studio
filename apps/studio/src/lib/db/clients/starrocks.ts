import { MysqlClient } from "./mysql";
import { FilterOptions, Routine } from "../models";

// StarRocks speaks the MySQL protocol and reports VERSION() as 8.0.33, so it
// reuses MysqlClient. Only the spots where StarRocks' information_schema
// diverges from MySQL are overridden here.
export class StarRocksClient extends MysqlClient {
  constructor(server, database) {
    super(server, database);
    this.dialect = 'mysql';
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
