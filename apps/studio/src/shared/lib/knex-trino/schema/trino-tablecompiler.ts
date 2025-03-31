import KnexTableCompiler from 'knex/lib/schema/tablecompiler';

interface TableOptions {
  primary?: string[] | string;
  comment?: string;
  [key: string]: any;
}

class TableCompiler_Trino extends KnexTableCompiler {
  // Create a new table
  createQuery(columns: string[], tableOptions: TableOptions = {}): string {
    let sql = `CREATE TABLE ${this.tableName()} (${columns.join(', ')}`;

    // Primary key can be provided as tableOptions
    if (tableOptions.primary && tableOptions.primary.length) {
      const primaryKeyColumns = Array.isArray(tableOptions.primary) 
        ? tableOptions.primary.map(col => this.formatter.wrap(col)).join(', ')
        : this.formatter.wrap(tableOptions.primary);
      
      sql += `, PRIMARY KEY (${primaryKeyColumns})`;
    }

    sql += ')';

    // Add comment if provided
    if (tableOptions.comment) {
      sql += ` COMMENT '${tableOptions.comment}'`;
    }

    return sql;
  }

  // Compile columns
  getColumns(): string[] {
    const columns = this.grouped.columns || [];
    return columns.map(column => this.compiler.compileColumn(column)).filter(Boolean);
  }

  // Add a primary key constraint
  primary(columns: string | string[]): void {
    this.pushQuery({
      sql: `ALTER TABLE ${this.tableName()} ADD PRIMARY KEY (${this.formatter.columnize(columns)})`,
    });
  }

  // Drop a table
  dropTableIfExists(): void {
    this.pushQuery({
      sql: `DROP TABLE IF EXISTS ${this.tableName()}`,
    });
  }

  // Rename a table
  renameTable(to: string): void {
    this.pushQuery({
      sql: `ALTER TABLE ${this.tableName()} RENAME TO ${this.formatter.wrap(to)}`,
    });
  }
}

export default TableCompiler_Trino;