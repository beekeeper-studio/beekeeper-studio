// Sqlanywhere Schema Compiler
// -------
import SchemaCompiler from 'knex/lib/schema/compiler';

class SchemaCompiler_Sqlanywhere extends SchemaCompiler {
    // Rename a table on the schema.
    renameTable(tableName, to) {
        this.pushQuery('alter table ' + this.formatter.wrap(tableName) + ' rename ' + this.formatter.wrap(to));
    }
    // Check whether a table exists on the query.
    hasTable(tableName) {
        this.pushQuery({
            sql: 'select TABLE_NAME from SYS.SYSTABLE where TABLE_NAME = ' +
                this.formatter.parameter(tableName),
            output: function(resp) {
                return resp.length > 0;
            }
        });
    }
    // Check whether a column exists on the schema.
    hasColumn(tableName, column) {
        this.pushQuery({
            sql: 'select COLUMN_NAME from SYS.SYSTABCOL C join SYS.SYSTAB T on C.TABLE_ID = T.TABLE_ID where TABLE_NAME = ' + this.formatter.parameter(tableName) +
                ' and COLUMN_NAME = ' + this.formatter.parameter(column),
            output: function(resp) {
                return resp.length > 0;
            }
        });
    }
    dropTable(tableName) {
        this.pushQuery('drop table ' + this.formatter.wrap(tableName));
    }
    dropTableIfExists(tableName) {
        this.pushQuery('drop table if exists ' + this.formatter.wrap(tableName));
    }
}

export default SchemaCompiler_Sqlanywhere;
