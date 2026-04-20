// BedrockClient - SQLite over MySQL protocol
import { MysqlClient } from "./mysql";
import { SqliteChangeBuilder } from "@shared/lib/sql/change_builder/SqliteChangeBuilder";
import { SqliteData } from "@shared/lib/dialects/sqlite";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { IDbConnectionServer } from "../backendTypes";
import { IDbConnectionDatabase } from "../types";
import {
  BksField,
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
import { createSQLiteKnex } from "./sqlite/utils";
import rawLog from "@bksLogger";

const log = rawLog.scope("bedrock");
const SD = SqliteData;

// Bedrock's MySQL plugin returns an OkPacket (not an array) for queries with
// no result rows. Everything under `this.driverExecuteSingle` normally hands
// us an array of row-objects, so normalise anywhere we iterate rows that may
// legitimately be empty.
function asRows<T = any>(rows: unknown): T[] {
  return Array.isArray(rows) ? (rows as T[]) : [];
}

interface PragmaColumnRow {
  cid: number;
  name: string;
  type: string;
  notnull: 0 | 1;
  dflt_value: string | null;
  pk: number;
  hidden: number;
}

export class BedrockClient extends MysqlClient {
  dialectData = SqliteData;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(server, database);
    // Bedrock speaks MySQL wire protocol but the SQL is SQLite. Swap the
    // inherited mysql2 knex for a sqlite3 one so generated queries use
    // SQLite syntax.
    this.knex = createSQLiteKnex("sqlite3");
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

    return asRows<TableOrView>(rows);
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `
      SELECT name
      FROM sqlite_master
      WHERE type = 'view'
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return asRows<TableOrView>(rows);
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
      return this.dataToColumns(asRows<PragmaColumnRow>(rows), table);
    }

    const allTables = (await this.listTables()) || [];
    const allViews = (await this.listViews()) || [];
    const tables = allTables.concat(allViews);

    // Bedrock's MySQL plugin doesn't reliably return multiple result sets for
    // `;`-joined batches, so fetch one table at a time.
    const out: ExtendedTableColumn[] = [];
    for (const t of tables) {
      const { rows } = await this.driverExecuteSingle(
        `PRAGMA table_xinfo(${SD.escapeString(t.name, true)})`,
        { overrideReadonly: true }
      );
      out.push(...this.dataToColumns(asRows<PragmaColumnRow>(rows), t.name));
    }
    return out;
  }

  // sqlite does not have routines
  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return [];
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const result = await this.driverExecuteSingle("PRAGMA database_list;", {
      overrideReadonly: true,
    });

    return asRows<{ file?: string }>(result.rows).map((row) => row.file || ":memory:");
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
    const found = asRows<PragmaColumnRow>(rows).filter((r) => r.pk > 0);
    if (found.length === 0) return [];
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
        log.error("query exception: ", ex);
        throw ex;
      }
    });

    return results;
  }

  private dataToColumns(data: PragmaColumnRow[], tableName: string): ExtendedTableColumn[] {
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
    return asRows<TableTrigger>(rows);
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

    const indexes = asRows<{ name: string; unique: number; origin: string }>(rows);
    if (indexes.length === 0) return [];

    // Bedrock's MySQL plugin doesn't reliably return multiple result sets
    // for a `;`-joined batch, so fetch columns per index individually.
    const indexColumns: IndexColumn[][] = [];
    for (const idx of indexes) {
      const res = await this.driverExecuteSingle(
        `PRAGMA index_xinfo('${SD.escapeString(idx.name)}')`,
        { overrideReadonly: true }
      );
      indexColumns.push(
        asRows<{ name: string | null; desc: number }>(res.rows)
          .filter((r) => !!r.name)
          .map((r) => ({ name: r.name as string, order: r.desc ? "DESC" : "ASC" }))
      );
    }

    return indexes.map((row, i) => ({
      id: `${table}.${row.name}`,
      table,
      schema: "",
      name: row.name,
      columns: indexColumns[i] || [],
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
    return asRows<any>(rows).map((row) => ({
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

  parseTableColumn(row: { name: string; type: string }): BksField {
    return {
      name: row.name,
      bksType: row.type?.toUpperCase() === "BLOB" ? "BINARY" : "UNKNOWN",
    };
  }
}
