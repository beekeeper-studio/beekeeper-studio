import { ChangeBuilderBase } from "@/shared/lib/sql/change_builder/ChangeBuilderBase";
import { CancelableQuery } from "../models";
import { BaseQueryResult, BasicDatabaseClient } from "./BasicDatabaseClient";


// TODO(@day): not sure if we should be throwing errors, or just logging warns
export abstract class BaseV1DatabaseClient<RawResultType extends BaseQueryResult> extends BasicDatabaseClient<RawResultType> {

  getBuilder(_table: string, _schema?: string): ChangeBuilderBase {
    throw new Error("V1 Drivers do not support change builders");
  }

  async query(_queryText: string, _options?: any): Promise<CancelableQuery> {
    throw new Error("V1 Drivers do not support custom queries");
  }

  async createDatabase(_databaseName: string, _charset: string, _collation: string): Promise<void> {
    throw new Error("V1 Drivers do not support creating databases")
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error("V1 Drivers do not support creating databases")
  }

  async getTableCreateScript(_table: string, _schema?: string): Promise<string> {
    throw new Error("V1 Drivers do not support generating scripts");
  }

  async getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    throw new Error("V1 Drivers do not support generating scripts");
  }

  async getMaterializedViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    throw new Error("V1 Drivers do not support generating scripts");
  }

  async getRoutineCreateScript(_routine: string, _type: string, _schema?: string): Promise<string[]> {
    throw new Error("V1 Drivers do not support generating scripts");
  }
}
