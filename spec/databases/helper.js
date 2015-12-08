import { join } from 'path';
import { readFileSync } from 'fs';
import knexInit from 'knex';


const truncateSQLScripts = {
  mysql: readSQLScript('mysql'),
  postgresql: readSQLScript('postgresql'),
};


/**
 * Configure spec helper for database tests.
 *
 * Inject a knex (query builder) in the `this` context.
 * And trucate the database after each test.
 */
export function config(serverInfo) {
  const { name: client, ...connection } = serverInfo;
  const truncateTablesSQL = truncateSQLScripts[client];

  beforeEach(function beforeEach() {
    this.knex = knexInit({ client, connection });
  });

  afterEach(function afterEach() {
    return truncateAllTables(this.knex, truncateTablesSQL);
  });
}


function readSQLScript(client) {
  const scriptPath = join(__dirname, `${client}/truncate-all-tables.sql`);
  return readFileSync(scriptPath, { encoding: 'utf8' });
}


function truncateAllTables(knex, truncateTablesSQL) {
  return knex.raw(truncateTablesSQL).then((sql) => {
    // with knex depending on the DB client
    // the rows may come in a "rows" property
    const statements = (sql.rows || sql[0]);
    return knex.raw(statements.map((sqlQuery) => {
      return sqlQuery.trucate_table_cmd;
    }).join(''));
  });
}
