import { join } from 'path';
import { readFileSync } from 'fs';
import knexInit from 'knex';


export function readSQLScript(client) {
  const scriptPath = join(__dirname, `./${client}/truncate-all-tables.sql`);
  return readFileSync(scriptPath, { encoding: 'utf8' });
}


export function truncateAllTables(serverInfo, { truncateTablesSQL }) {
  const { name: client, ...connection } = serverInfo;
  const knex = knexInit({ client, connection });

  return knex.raw(truncateTablesSQL).then((sql) => {
    // with knex depending on the DB client
    // the rows may come in a "rows" property
    const statements = (sql.rows || sql[0]);
    return knex.raw(statements.map((sqlQuery) => {
      return sqlQuery.trucate_table_cmd;
    }).join(''));
  });
}
