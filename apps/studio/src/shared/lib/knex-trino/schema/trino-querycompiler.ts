import KnexQueryCompiler from "knex/lib/query/querycompiler";

class QueryCompiler_Trino extends KnexQueryCompiler {
  // Compiles the "select" query for Trino
  select(): string {
    const sql = super.select();
    
    // Apply limit and offset if provided
    const { limit, offset } = this.single;
    
    let modifiedSql = sql;
    
    if (limit || offset) {
      if (offset && !limit) {
        // Trino requires a LIMIT when OFFSET is used
        modifiedSql += ` OFFSET ${offset} ROWS`;
      } else if (limit && !offset) {
        modifiedSql += ` LIMIT ${limit}`;
      } else {
        modifiedSql += ` LIMIT ${limit} OFFSET ${offset}`;
      }
    }
    
    return modifiedSql;
  }

  // Override the basic where clause behavior for Trino specifics if needed
  whereBasic(statement: any): string {
    return super.whereBasic(statement);
  }

  // Override the whereIn method for Trino specifics if needed
  whereIn(statement: any): string {
    return super.whereIn(statement);
  }

  // Override the whereNull method for Trino specifics if needed
  whereNull(statement: any): string {
    return super.whereNull(statement);
  }

  // For Trino, we use a standard INSERT statement
  insert(): string {
    return super.insert();
  }

  // For Trino, we use ALTER TABLE for update operations
  update(): string {
    const withSQL = this.with();
    const { tableName } = this;
    const updateData = this._prepUpdate(this.single.update);
    const wheres = this.where();
    
    // Format the update clause for Trino
    return (
      withSQL +
      `UPDATE ${tableName} SET ` +
      updateData.join(', ') +
      (wheres ? ` ${wheres}` : '')
    );
  }

  // For Trino, we use DELETE FROM
  del(): string {
    const withSQL = this.with();
    const { tableName } = this;
    const wheres = this.where();
    
    return (
      withSQL +
      `DELETE FROM ${tableName}` +
      (wheres ? ` ${wheres}` : '')
    );
  }
}

export default QueryCompiler_Trino;