// BedrockClient - SQLite over MySQL protocol
import { MysqlClient } from "./mysql";
import { SqliteChangeBuilder } from "@shared/lib/sql/change_builder/SqliteChangeBuilder";
import { SqliteData } from "@shared/lib/dialects/sqlite";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { IDbConnectionServer } from "../backendTypes";
import { IDbConnectionDatabase } from "../types";
import {
  ExtendedTableColumn,
  TableTrigger,
  TableIndex,
  Routine,
  FilterOptions,
  TableOrView,
  TableColumn,
  SchemaFilterOptions,
  DatabaseFilterOptions,
  PrimaryKeyColumn,
  TableProperties,
  TableChanges,
} from "../models";
import {
  IndexColumn,
  TableKey as SharedTableKey,
} from "@shared/lib/dialects/models";
import _ from "lodash";
import { parseVersion } from "@/common/version";
import { buildSelectTopQuery } from "./utils";
import logger from "@/lib/log/mainLogger";

const SD = SqliteData;

export class BedrockClient extends MysqlClient {
  dialectData = SqliteData;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(server, database);
    // Override to use SQLite dialect for SQL syntax
    this.dialect = "sqlite";
  }

  getBuilder(table: string, _schema?: string): ChangeBuilderBase {
    // Use SQLite change builder for DDL operations
    return new SqliteChangeBuilder(table);
  }

  async getVersion() {
    const { rows } = await this.driverExecuteSingle(
      "SELECT sqlite_version() as version"
    );
    const version = rows[0]["version"];
    console.log("version", version);
    const { major, minor, patch } = parseVersion(version);
    return {
      versionString: version,
      version: Number(`${major}.${minor}`),
      major,
      minor,
      patch,
    };
  }

  async listTables(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `
      SELECT name
      FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows as TableOrView[];
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `
      SELECT name
      FROM sqlite_master
      WHERE type = 'view'
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows as TableOrView[];
  }

  listMaterializedViewColumns(
    _table: string,
    _schema?: string
  ): Promise<TableColumn[]> {
    return Promise.resolve([]); // DOES NOT SUPPORT IT
  }

  // Override listTableColumns to use SQLite PRAGMA instead of information_schema
  async listTableColumns(
    table?: string,
    _schema?: string
  ): Promise<ExtendedTableColumn[]> {
    if (table) {
      const sql = `PRAGMA table_xinfo(${SD.escapeString(table, true)})`;
      const { rows } = await this.driverExecuteSingle(sql, {
        overrideReadonly: true,
      });
      return this.dataToColumns(rows, table);
    }

    const allTables = (await this.listTables()) || [];
    const allViews = (await this.listViews()) || [];
    const tables = allTables.concat(allViews);

    const everything = tables.map((table) => {
      return {
        tableName: table.name,
        sql: `PRAGMA table_xinfo(${SD.escapeString(table.name, true)})`,
        results: null,
      };
    });

    const query = everything.map((e) => e.sql).join(";");
    const allResults = await this.driverExecuteMultiple(query, {
      overrideReadonly: true,
    });

    // Handle case where driverExecuteMultiple returns null or undefined
    const safeAllResults = allResults || [];
    const results = safeAllResults.map((r, i) => {
      return {
        result: r,
        ...everything[i],
      };
    });
    const final = _.flatMap(results, (item, _idx) =>
      this.dataToColumns(item?.result?.rows || [], item.tableName)
    );

    return final;
  }

  // sqlite does not have routines
  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return [];
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const result = await this.driverExecuteSingle("PRAGMA database_list;", {
      overrideReadonly: true,
    });

    return result.rows.map((row) => row.file || ":memory:");
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string> {
    const keys = await this.getPrimaryKeys(table, schema);
    return keys.length === 1 ? keys[0].columnName : null;
  }

  async getPrimaryKeys(
    table: string,
    _schema?: string
  ): Promise<PrimaryKeyColumn[]> {
    const sql = `pragma table_xinfo('${SD.escapeString(table)}')`;
    const { rows } = await this.driverExecuteSingle(sql, {
      overrideReadonly: true,
    });
    const found = rows.filter((r) => r.pk > 0);
    if (!found || found.length === 0) return [];
    return found.map((r) => ({
      columnName: r.name,
      position: Number(r.pk),
    }));
  }

  async getTableLength(table: string, _schema?: string): Promise<number> {
    const { countQuery, params } = buildSelectTopQuery(
      table,
      null,
      null,
      null,
      []
    );
    const countResults = await this.driverExecuteSingle(countQuery, { params });
    const rowWithTotal = countResults.rows.find((row) => {
      return row.total;
    });
    const totalRecords = rowWithTotal ? rowWithTotal.total : 0;
    return Number(totalRecords);
  }

  async getTableProperties(
    table: string,
    _schema?: string
  ): Promise<TableProperties> {
    const [length, indexes, triggers, relations] = await Promise.all([
      this.getTableLength(table),
      this.listTableIndexes(table),
      this.listTableTriggers(table),
      this.getTableKeys(table),
    ]);
    return {
      size: length,
      indexes,
      relations,
      triggers,
      partitions: [],
    };
  }

  // TODO transactions?
  async executeApplyChanges(changes: TableChanges): Promise<any[]> {
    let results = [];

    await this.runWithConnection(async (connection) => {

      try {
        if (changes.inserts) {
          await this.insertRows(changes.inserts, connection);
        }

        if (changes.updates) {
          results = await this.updateValues(changes.updates, connection);
        }

        if (changes.deletes) {
          await this.deleteRows(changes.deletes, connection);
        }
      } catch (ex) {
        logger().error("query exception: ", ex);
        throw ex;
      }
    });

    return results;
  }

  private dataToColumns(data: any[], tableName: string): ExtendedTableColumn[] {
    return data.map((row) => {
      const defaultValue = row.dflt_value === "NULL" ? null : row.dflt_value;
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
  async listTableTriggers(
    table: string,
    _schema?: string
  ): Promise<TableTrigger[]> {
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
  async listTableIndexes(
    table: string,
    _schema?: string
  ): Promise<TableIndex[]> {
    const sql = `PRAGMA index_list('${SD.escapeString(table)}')`;

    const { rows } = await this.driverExecuteSingle(sql, {
      overrideReadonly: true,
    });

    if (!rows || rows.length === 0) {
      return [];
    }

    const allSQL = rows
      .map((row) => `PRAGMA index_xinfo('${SD.escapeString(row.name)}')`)
      .join(";");
    const { rows: infoRows } = (await this.driverExecuteSingle(allSQL, {
      overrideReadonly: true,
    })) as any;

    // Handle case where driverExecuteMultiple returns null or undefined
    const safeInfos = infoRows || [];

    const indexColumns: IndexColumn[][] = safeInfos.map((result) => {
      return (result?.rows || [])
        .filter((r) => !!r.name)
        .map((r) => ({ name: r.name, order: r.desc ? "DESC" : "ASC" }));
    });

    return rows.map((row, idx) => ({
      id: `${table}.${row.name}`,
      table,
      schema: "",
      name: row.name,
      columns: indexColumns[idx] || [],
      unique: !!row.unique,
      primary: row.origin === "pk",
    }));
  }
  listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    return Promise.resolve([]); // DOES NOT SUPPORT IT
  }

  getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return Promise.resolve([]); // TODO: not implemented yet
  }

  // Override getTableKeys to use SQLite PRAGMA instead of information_schema
  async getTableKeys(
    table: string,
    _schema?: string
  ): Promise<SharedTableKey[]> {
    const sql = `pragma foreign_key_list('${SD.escapeString(table)}')`;
    const { rows } = await this.driverExecuteSingle(sql, {
      overrideReadonly: true,
    });
    return rows.map((row) => ({
      constraintName: row.id,
      constraintType: "FOREIGN",
      toTable: row.table,
      toSchema: "",
      fromSchema: "",
      fromTable: table,
      fromColumn: row.from,
      toColumn: row.to,
      onUpdate: row.on_update,
      onDelete: row.on_delete,
      isComposite: false, // SQLite foreign keys are typically single column
    }));
  }

  // We also need to override parseTableColumn - let's use a simplified version
  parseTableColumn(row: any): any {
    return {
      name: row.name,
      type: row.type,
      nullable: Number(row.notnull || 0) === 0,
      defaultValue: row.dflt_value === "NULL" ? null : row.dflt_value,
    };
  }
}
