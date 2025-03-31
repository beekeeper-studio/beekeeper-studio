import KnexViewCompiler from 'knex/lib/schema/viewcompiler';

class ViewCompiler_Trino extends KnexViewCompiler {
  // Create a new view
  createView(viewName: string, selectQuery: string): string {
    return `CREATE VIEW ${this.formatter.wrap(viewName)} AS ${selectQuery}`;
  }

  // Create or replace a view
  createOrReplaceView(viewName: string, selectQuery: string): string {
    return `CREATE OR REPLACE VIEW ${this.formatter.wrap(viewName)} AS ${selectQuery}`;
  }

  // Drop a view
  dropView(viewName: string): string {
    return `DROP VIEW ${this.formatter.wrap(viewName)}`;
  }

  // Drop a view if it exists
  dropViewIfExists(viewName: string): string {
    return `DROP VIEW IF EXISTS ${this.formatter.wrap(viewName)}`;
  }
}

export default ViewCompiler_Trino;