const ColumnCompiler = require("knex/lib/schema/columncompiler");
const tail = require("lodash/tail");

class ColumnCompiler_ClickHouse extends ColumnCompiler {
  constructor(client, tableCompiler, columnBuilder) {
    super(client, tableCompiler, columnBuilder);
    this.modifiers = [
      'nullable',
      'defaultTo',
    ];

    this.mustAddPrimaryKey = false
  }

  getColumnType() {
    // Column type is cached so side effects (such as in pg native enums) are only run once
    if (!this._columnType) {
      const type = this[this.type];
      this._columnType =
        typeof type === "function" ? type.apply(this, tail(this.args)) : type;
    }

    let columnType = this._columnType;

    if (this.checkNullable()) {
      columnType =`Nullable(${columnType})`;
    }

    if (this.mustAddPrimaryKey) {
      columnType += ' primary key';
    }

    return columnType;
  }

  checkNullable() {
    if (this.modified.nullable && this.modified.nullable[0] !== false) {
      return true;
    }
    return false;
  }

  // Modifiers
  // ------

  increments(options = { primaryKey: true }) {
    // ClickHouse doesn't support autoincrement so we won't add it to the query
    this.mustAddPrimaryKey = this.tableCompiler._canBeAddPrimaryKey(options)
    return "integer"
  }

  nullable(_nullable) {
    // Leave this empty because Nullable is added in getColumnType
    return "";
  }
}

module.exports = ColumnCompiler_ClickHouse
