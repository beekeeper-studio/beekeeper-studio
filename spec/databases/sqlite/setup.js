import path from 'path';
import { exec } from 'child_process';


export default function run(config) {
  before(async () => {
    const script = path.join(__dirname, 'schema/schema.sql');
    await executeCommand(`sqlite3 ${config.database} < ${script}`);
  });
}


function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
}
