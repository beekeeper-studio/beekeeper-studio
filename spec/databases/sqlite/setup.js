import fs from 'fs';
import path from 'path';

const sqlite3 = require('sqlite3').verbose();

export default function run(config) {
  before(async () => {
    const db = new sqlite3.Database(config.database);

    const script = fs.readFileSync(path.join(__dirname, 'schema/schema.sql'), { encoding: 'utf8' });

    await executeQuery(db, script);

    db.close();
  });
}


function executeQuery(client, query) {
  return new Promise((resolve, reject) => {
    client.exec(query, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
}
