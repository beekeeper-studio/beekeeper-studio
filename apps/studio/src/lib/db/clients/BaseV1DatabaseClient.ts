import { AlterPartitionsSpec, AlterTableSpec, IndexAlterations, RelationAlterations } from "@/shared/lib/dialects/models";
import { ChangeBuilderBase } from "@/shared/lib/sql/change_builder/ChangeBuilderBase";
import { CancelableQuery, TableChanges, TableUpdateResult } from "../models";
import { DatabaseElement } from "../types";
import { BaseQueryResult, BasicDatabaseClient } from "./BasicDatabaseClient";
import rawLog from '@bksLogger';

const log = rawLog.scope('BaseV1DatabaseClient');


// TODO(@day): not sure if we should be throwing errors, or just logging warns
export abstract class BaseV1DatabaseClient<RawResultType extends BaseQueryResult> extends BasicDatabaseClient<RawResultType> {

  getBuilder(_table: string, _schema?: string): ChangeBuilderBase {
    log.error("V1 Drivers do not support change builders");
    return null;
  }

  async query(_queryText: string, _options?: any): Promise<CancelableQuery> {
    log.error("V1 Drivers do not support custom queries");
    return null;
  }

  async createDatabase(_databaseName: string, _charset: string, _collation: string): Promise<string> {
    log.error("V1 Drivers do not support creating databases")
    return '';
  }

  async createDatabaseSQL(): Promise<string> {
    log.error("V1 Drivers do not support creating databases")
    return '';
  }

  async getTableCreateScript(_table: string, _schema?: string): Promise<string> {
    log.error("V1 Drivers do not support generating scripts");
    return '';
  }

  async getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    log.error("V1 Drivers do not support generating scripts");
    return [];
  }

  async getMaterializedViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    log.error("V1 Drivers do not support generating scripts");
    return [];
  }

  async getRoutineCreateScript(_routine: string, _type: string, _schema?: string): Promise<string[]> {
    log.error("V1 Drivers do not support generating scripts");
    return [];
  }

  async executeApplyChanges(_changes: TableChanges): Promise<TableUpdateResult[]> {
    log.error("V1 Drivers do not support applying changes");
    return [];
  }

  async duplicateTable(_tableName: string, _duplicateTableName: string, _schema?: string): Promise<void> {
    log.error("V1 Drivers do not support duplicating tables");
  }

  async duplicateTableSql(_tableName: string, _duplicateTableName: string, _schema?: string): Promise<string> {
    log.error("V1 Drivers do not support duplicating tables");
    return '';
  }

  async dropElement(_elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<void> {
    log.error("V1 Drivers do not support dropping elements");
  }

  async alterTableSql(_change: AlterTableSpec): Promise<string> {
    log.error("V1 Drivers do not support altering tables");
    return '';
  }

  async alterTable(_change: AlterTableSpec): Promise<void> {
    log.error("V1 Drivers do not support altering tables");
  }

  async alterIndexSql(_changes: IndexAlterations): Promise<string | null> {
    log.error("V1 Drivers do not support altering indexes");
    return null;
  }

  async alterIndex(_changes: IndexAlterations): Promise<void> {
    log.error("V1 Drivers do not support altering indexes");
  }

  async alterRelationSql(_changes: RelationAlterations): Promise<string | null> {
    log.error("V1 Drivers do not support altering relations");
    return null;
  }

  async alterRelation(_changes: RelationAlterations): Promise<void> {
    log.error("V1 Drivers do not support altering relations");
  }

  async alterPartitionSql(_changes: AlterPartitionsSpec): Promise<string | null> {
    log.error("V1 Drivers do not support altering partitions");
    return null;
  }

  async alterPartition(_changes: AlterPartitionsSpec): Promise<void> {
    log.error("V1 Drivers do not support altering partitions");
  }

  async applyChangesSql(_changes: TableChanges): Promise<string> {
    log.error("V1 Drivers do not support applying changes");
    return '';
  }

  async setTableDescription(_table: string, _description: string, _schema?: string): Promise<string> {
    log.error("V1 Drivers do not support setting table descriptions");
    return '';
  }

  async setElementNameSql(_elementName: string, _newElementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    log.error("V1 Drivers do not support setting element names");
    return '';
  }

  async truncateElementSql(_elementName: string, _typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    log.error("V1 Drivers do not support truncating elements");
    return '';
  }
  async truncateAllTables(_schema?: string): Promise<void> {
    log.error("V1 Drivers do not support truncating");
  }
}
