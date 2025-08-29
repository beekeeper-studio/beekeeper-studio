// BedrockClient - SQLite over MySQL protocol
import { MysqlClient } from "./mysql";
import { SqliteChangeBuilder } from "@shared/lib/sql/change_builder/SqliteChangeBuilder";
import { SqliteData } from "@shared/lib/dialects/sqlite";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { IDbConnectionServer } from "../backendTypes";
import { IDbConnectionDatabase } from "../types";
import { ExtendedTableColumn, TableTrigger, TableIndex, TableKey } from "../models";
import { IndexColumn, TableKey as SharedTableKey } from "@shared/lib/dialects/models";
import _ from "lodash";

const SD = SqliteData;

export class BedrockClient extends MysqlClient {
  dialectData = SqliteData;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(server, database);
    // Override to use SQLite dialect for SQL syntax
    this.dialect = 'sqlite';
  }

  getBuilder(table: string, _schema?: string): ChangeBuilderBase {
    // Use SQLite change builder for DDL operations
    return new SqliteChangeBuilder(table);
  }

  // Override listTableColumns to use SQLite PRAGMA instead of information_schema
  async listTableColumns(table?: string, _schema?: string): Promise<ExtendedTableColumn[]> {
    if (table) {
      const sql = `PRAGMA table_xinfo(${SD.escapeString(table, true)})`;
      const { rows } = await this.driverExecuteSingle(sql, { overrideReadonly: true });
      return this.dataToColumns(rows, table);
    }

    const allTables = (await this.listTables()) || [];
    const allViews = (await this.listViews()) || [];
    const tables = allTables.concat(allViews);

    const everything = tables.map((table) => {
      return {
        tableName: table.name,
        sql: `PRAGMA table_xinfo(${SD.escapeString(table.name, true)})`,
        results: null
      };
    });

    const query = everything.map((e) => e.sql).join(";");
    const allResults = await this.driverExecuteMultiple(query, { overrideReadonly: true });
    
    // Handle case where driverExecuteMultiple returns null or undefined
    const safeAllResults = allResults || [];
    const results = safeAllResults.map((r, i) => {
      return {
        result: r,
        ...everything[i]
      };
    });
    const final = _.flatMap(results, (item, _idx) => this.dataToColumns(item?.result?.rows || [], item.tableName));

    return final;
  }

  private dataToColumns(data: any[], tableName: string): ExtendedTableColumn[] {
    return data.map((row) => {
      const defaultValue = row.dflt_value === 'NULL' ? null : row.dflt_value;
      return {
        tableName,
        columnName: row.name,
        dataType: row.type,
        nullable: Number(row.notnull || 0) === 0,
        defaultValue,
        ordinalPosition: Number(row.cid),
        hasDefault: !_.isNil(defaultValue),
        generated: Number(row.hidden) === 2 || Number(row.hidden) === 3,
        bksField: this.parseTableColumn(row),
      };
    });
  }

  // Override listTableTriggers to use SQLite sqlite_master instead of information_schema
  async listTableTriggers(table: string, _schema?: string): Promise<TableTrigger[]> {
    const sql = `
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'trigger'
        AND tbl_name = '${table}'
    `;

    const { rows } = await this.driverExecuteSingle(sql);
    return rows as TableTrigger[];
  }

  // Override listTableIndexes to use SQLite PRAGMA instead of information_schema
  async listTableIndexes(table: string, _schema?: string): Promise<TableIndex[]> {
    const sql = `PRAGMA index_list('${SD.escapeString(table)}')`;

    const { rows } = await this.driverExecuteSingle(sql, { overrideReadonly: true });

    if (!rows || rows.length === 0) {
      return [];
    }

    const allSQL = rows.map((row) => `PRAGMA index_xinfo('${SD.escapeString(row.name)}')`).join(";");
    const { rows: infoRows } = await this.driverExecuteMultiple(allSQL, { overrideReadonly: true });

    // Handle case where driverExecuteMultiple returns null or undefined
    const safeInfos = infoRows || [];

    const indexColumns: IndexColumn[][] = safeInfos.map((result) => {
      return (result?.rows || []).filter((r) => !!r.name).map((r) => ({ name: r.name, order: r.desc ? 'DESC' : 'ASC' }));
    });

    return rows.map((row, idx) => ({
      id: `${table}.${row.name}`,
      table,
      schema: '',
      name: row.name,
      columns: indexColumns[idx] || [],
      unique: !!row.unique,
      primary: row.origin === 'pk'
    }));
  }

  // Override getTableKeys to use SQLite PRAGMA instead of information_schema
  async getTableKeys(table: string, _schema?: string): Promise<SharedTableKey[]> {
    const sql = `pragma foreign_key_list('${SD.escapeString(table)}')`;
    const { rows } = await this.driverExecuteSingle(sql, { overrideReadonly: true });
    return rows.map(row => ({
      constraintName: row.id,
      constraintType: 'FOREIGN',
      toTable: row.table,
      toSchema: '',
      fromSchema: '',
      fromTable: table,
      fromColumn: row.from,
      toColumn: row.to,
      onUpdate: row.on_update,
      onDelete: row.on_delete
    }));
  }

  // We also need to override parseTableColumn - let's use a simplified version
  private parseTableColumn(row: any): any {
    return {
      name: row.name,
      type: row.type,
      nullable: Number(row.notnull || 0) === 0,
      defaultValue: row.dflt_value === 'NULL' ? null : row.dflt_value,
    };
  }
}