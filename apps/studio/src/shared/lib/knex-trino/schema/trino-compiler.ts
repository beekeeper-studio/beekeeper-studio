import KnexSchemaCompiler from 'knex/lib/schema/compiler';

class SchemaCompiler_Trino extends KnexSchemaCompiler {
  // Check whether a table exists on the query.
  hasTable(tableName: string): void {
    const tableNameWithSchema = this.schema ? `${this.schema}.${tableName}` : tableName;
    
    this.pushQuery({
      sql: 'SELECT table_name FROM information_schema.tables WHERE table_name = ? AND table_schema = ?',
      bindings: [
        tableName,
        this.schema || 'default' // Use default schema if not specified
      ],
      method: 'select',
      output: function output(resp: any[]): boolean {
        return resp.length > 0;
      },
    });
  }
  
  // Create a new table
  createTable(tableBlock: Function | any): void {
    // In Trino, we can just push a standard CREATE TABLE query
    // The tableBlock is a function in normal Knex use, but for tests
    // we need to handle when it's not a function
    if (typeof tableBlock === 'function') {
      tableBlock(this);
    }
    
    // Get the columns from the table builder
    const columns = this.getColumns();
    
    // Generate the SQL for creating the table
    const sql = `CREATE TABLE ${this.formatter.wrap(this.tableNameRaw)} (${columns.join(', ')})`;
    
    this.pushQuery({
      sql,
      bindings: []
    });
  }
  
  // Drop a table
  dropTable(tableName: string): void {
    this.pushQuery({
      sql: `DROP TABLE ${this.formatter.wrap(tableName)}`,
      bindings: []
    });
  }
  
  // Alter table
  alterTable(tableBlock: Function | any): void {
    // Process the table if tableBlock is a function
    if (typeof tableBlock === 'function') {
      tableBlock(this);
    }
    
    // Check for alter commands
    if (this._statements && this._statements.length) {
      for (let i = 0; i < this._statements.length; i++) {
        const statement = this._statements[i];
        if (statement.method === 'add') {
          this.pushQuery({
            sql: `ALTER TABLE ${this.formatter.wrap(this.tableNameRaw)} ADD COLUMN ${statement.columns.join(', ')}`,
            bindings: []
          });
        }
        if (statement.method === 'drop') {
          this.pushQuery({
            sql: `ALTER TABLE ${this.formatter.wrap(this.tableNameRaw)} DROP COLUMN ${this.formatter.wrap(statement.columns[0])}`,
            bindings: []
          });
        }
      }
    }
  }
  
  // Helper method to get columns from statements
  getColumns(): string[] {
    if (!this._statements) return [];
    const columns: string[] = [];
    for (let i = 0; i < this._statements.length; i++) {
      const statement = this._statements[i];
      if (statement.grouping === 'columns') {
        columns.push(statement.sql);
      }
    }
    return columns;
  }
}

export default SchemaCompiler_Trino;