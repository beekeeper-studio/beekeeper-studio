import fs from 'fs';

/**
 * Creates an empty file at `filePath`. A file that is already there is left
 * as it is, contents and all.
 *
 * This is how a new SQLite database is made: SQLite opens an empty file as an
 * empty database, and connecting refuses a path with no file behind it, so a
 * mistyped path is not quietly turned into a new database.
 */
export function createEmptyFile(filePath: string): void {
  try {
    fs.closeSync(fs.openSync(filePath, 'wx'));
  } catch (e) {
    if (e?.code !== 'EEXIST') throw e;
  }
}
