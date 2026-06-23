// StarRocks knex client (test harness only)
// ------------------------------------------
// StarRocks speaks the MySQL wire protocol, so DML/queries go through the
// stock mysql2 dialect. Its DDL, however, diverges from MySQL:
//   - no UNSIGNED type
//   - AUTO_INCREMENT only on BIGINT
//   - PRIMARY KEY must be declared at table level, AFTER the column list,
//     e.g. `CREATE TABLE t (...) PRIMARY KEY(id)` (inline `primary key` and
//     a `, primary key(...)` clause inside the parens both fail to parse)
//   - no FOREIGN KEY constraints
//   - no `engine = ...` / charset / collate clauses
// Only the schema/table/column compilers are overridden here; everything else
// is inherited from mysql2.

import Client_MySQL2 from "knex/lib/dialects/mysql2";
import TableCompiler_MySQL from "knex/lib/dialects/mysql/schema/mysql-tablecompiler";
import ColumnCompiler_MySQL from "knex/lib/dialects/mysql/schema/mysql-columncompiler";

class TableCompiler_StarRocks extends TableCompiler_MySQL {
  createQuery(columns, ifNot, like) {
    const createStatement = ifNot
      ? "create table if not exists "
      : "create table ";

    let columnsSql = " (" + columns.sql.join(", ");
    columnsSql += this._addChecks();
    columnsSql += ")";

    let sql =
      createStatement +
      this.tableName() +
      (like && this.tableNameLike()
        ? " like " + this.tableNameLike()
        : columnsSql);

    // StarRocks wants the key declaration OUTSIDE the column parens.
    if (!like) {
      sql += this.primaryKeys() || "";
    }

    this.pushQuery(sql);
    if (like) {
      this.addColumns(columns, this.addColumnsPrefix);
    }
  }

  // Table-level `PRIMARY KEY(...)` after the column list. AUTO_INCREMENT
  // columns (knex `increments()`) are folded into the key automatically, the
  // same way MySQL implicitly makes an auto-increment column the primary key.
  primaryKeys() {
    const pks = (this.grouped.alterTable || []).filter(
      (k) => k.method === "primary"
    );

    // A table-level `primary(['a','b'])` passes an array; a column-level
    // `.primary()` passes the column name as a bare string.
    let columns = [];
    if (pks.length > 0 && pks[0].args.length > 0) {
      const raw = pks[0].args[0];
      columns = Array.isArray(raw) ? [...raw] : [raw];
    }

    // Fold auto-increment columns into the key. knex defaults an unnamed
    // `increments()` column to `id`, but stores no name in `_args`.
    (this.grouped.columns || [])
      .filter((c) => ["increments", "bigincrements"].includes(c.builder._type))
      .map((c) => c.builder._args[0] || "id")
      .forEach((c) => {
        if (!columns.includes(c)) {
          columns.unshift(c);
        }
      });

    if (!columns.length) {
      return "";
    }

    return ` primary key (${this.formatter.columnize(columns)})`;
  }

  // StarRocks has no foreign-key constraints; drop them silently.
  foreign() {
    return "";
  }

  // StarRocks has no UNIQUE constraints and no standard secondary indexes
  // (it uses prefix/bitmap indexes with different syntax). Drop both so table
  // creation succeeds; the corresponding tests are disabled via dialect data.
  unique() {
    return "";
  }

  index() {
    return "";
  }
}

class ColumnCompiler_StarRocks extends ColumnCompiler_MySQL {
  constructor(client, tableCompiler, columnBuilder) {
    super(client, tableCompiler, columnBuilder);
    // Drop the `unsigned` modifier entirely (see unsigned() below).
    this.modifiers = ["nullable", "defaultTo", "comment", "collate", "first", "after"];
  }

  // BIGINT, no UNSIGNED, and no inline `primary key` — the key is added at
  // table level by TableCompiler_StarRocks.primaryKeys().
  increments() {
    return "bigint not null auto_increment";
  }

  bigincrements() {
    return "bigint not null auto_increment";
  }

  unsigned() {
    return "";
  }

  // StarRocks has no TIMESTAMP type; DATETIME covers the same ground and
  // accepts `default CURRENT_TIMESTAMP`.
  timestamp() {
    return "datetime";
  }
}

export default class Client_StarRocks extends Client_MySQL2 {
  tableCompiler(...args) {
    return new TableCompiler_StarRocks(this, ...args);
  }

  columnCompiler(...args) {
    return new ColumnCompiler_StarRocks(this, ...args);
  }
}
