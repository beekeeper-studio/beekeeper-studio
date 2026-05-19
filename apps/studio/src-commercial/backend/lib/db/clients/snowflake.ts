import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { IDbConnectionDatabase } from "@/lib/db/types";
import { Connection } from "snowflake-sdk"

interface SnowflakeResult {
  columns: { name: string, type?: string | number | any }[]
  rows: any[][] | Record<string, any>[];
  arrayMode: boolean;
}

const snowflakeContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null;
  }
};


export class SnowflakeClient extends BasicDatabaseClient<SnowflakeResult, Connection> {

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, snowflakeContext, server, database);
    this.dialect = "generic";
    this.readOnlyMode = server?.config?.readOnlyMode || false;
  }
}
