import { promises as fs } from 'fs'
import path from 'path';
import platformInfo from '@/common/platform_info';
import { IQueryFolder } from '@/common/interfaces/IQueryFolder';
import { state } from './handlerState';
import { CloudClient } from '@/lib/cloud/CloudClient';
import rawLog from '@bksLogger';
import ISavedQuery from '@/common/interfaces/ISavedQuery';

const log = rawLog.scope('fileHandlers');

const VIMRC_FILENAME = '.beekeeper.vimrc';
// queries are limited to 2_000_000 characters, so the upper limit is 4x that amount
const MAX_SQL_FILE_BYTES = 4 * 2_000_000;
const SQL_FILE_EXTENSIONS = new Set(['.sql', '.txt']);

// I am just assuming that big batches might be an issue, so we have the ability to cap here
// as well as cap the amount of rows so we don't piss off the active record transaction
// I'm also not sure what size the cloud can actually handle
const MAX_BATCH_BYTES = 50 * 1024 * 1024;
const MAX_BATCH_ROWS = 100;

export interface IFileHandlers {
  /**
   * Read the user's vim config file from a fixed location inside the
   * beekeeper user directory. The renderer cannot pass a path. Returns the
   * file contents as utf-8, or null if the file does not exist.
   */
  "config/readVimrc": () => Promise<string | null>;
  /**
   * Read a query file the user picked through a native open dialog. The
   * path is validated to (a) end in one of the allowed text extensions
   * (.sql, .txt) and (b) point at a regular file the user already has
   * access to. Content is returned as utf-8.
   */
  "file/readSqlFile": ({ path }: { path: string }) => Promise<string>;

  "file/importDirectory": ({ dir, parentId, sId }: { dir: string, parentId: number, sId: string }) => Promise<string[]>;
}

export const FileHandlers: IFileHandlers = {
    "config/readVimrc": async function(): Promise<string | null> {
      const vimrcPath = path.join(platformInfo.userDirectory, VIMRC_FILENAME);
      try {
        return await fs.readFile(vimrcPath, { encoding: 'utf-8' });
      } catch (e: any) {
        if (e?.code === 'ENOENT') return null;
        throw e;
      }
    },

    "file/readSqlFile": async function({ path: targetPath }: { path: string; }): Promise<string> {
      if (typeof targetPath !== 'string' || targetPath.length === 0) {
        throw new Error('readSqlFile requires a path');
      }
      const ext = path.extname(targetPath).toLowerCase();
      if (!SQL_FILE_EXTENSIONS.has(ext)) {
        const allowed = [...SQL_FILE_EXTENSIONS].join(', ');
        throw new Error(
          `readSqlFile only accepts ${allowed} files, got "${ext || '(none)'}"`
        );
      }
      const stat = await fs.stat(targetPath);
      if (!stat.isFile()) {
        throw new Error(`readSqlFile target is not a regular file: ${targetPath}`);
      }
      if (stat.size > MAX_SQL_FILE_BYTES) {
        throw new Error(
          `readSqlFile target exceeds ${MAX_SQL_FILE_BYTES} bytes: ${targetPath}`
        );
      }
      const contents = await fs.readFile(targetPath, { encoding: 'utf-8' });

      if (contents.length > 2_000_000) {
        throw new Error(
          `readSqlFile target exceeds length 2000000 characters: ${targetPath}`
        );
      }

      return contents;
    },
    'file/importDirectory': async function({ dir, parentId, sId }: { dir: string, parentId: number, sId: string }): Promise<string[]> {
      if (typeof dir !== 'string' || dir.length === 0) {
        // throw?
      }

      const stat = await fs.stat(dir);
      if (!stat.isDirectory()) {
        throw new Error('file/importDirectory called with non directory path');
      }

      // TODO (@day): we probably want to do this locally as well
      const client = state(sId).cloudClient;

      if (!client) {
        throw new Error('Could not access cloud');
      }

      const warnings = await importDirectory(client, dir, parentId);

      log.info(`Import directory completed with ${warnings.length} warnings`)

      return warnings;
    }
};

async function importDirectory(client: CloudClient, dir: string, parentId: number | null): Promise<string[]> {
  const warnings = [];

  let parent: IQueryFolder = {
    id: null,
    name: path.basename(dir),
    parentId
  } as IQueryFolder;

  log.info("importing: ", parent);

  [parent] = await client.queryFolders.import([parent]);

  log.info("Imported: ", parent)

  {
    const childFileNames = await getDirChildren(dir, false);

    let currentBatchBytes = 0;
    let currentBatchRows = 0;
    let currentQueries: ISavedQuery[] = []

    for (const fileName of childFileNames) {
      const filePath = path.join(dir, fileName);

      const stat = await fs.stat(filePath);

      if (!stat.isFile()) {
        warnings.push(`Skipping ${filePath}, is not a file`)
        continue;
      }

      const ext = path.extname(filePath).toLowerCase();
      if (!SQL_FILE_EXTENSIONS.has(ext)) {
        const allowed = [...SQL_FILE_EXTENSIONS].join(', ');
        warnings.push(`Skipping ${filePath}, only ${allowed} files are allowed, got "${ext || '(none)'}"`);
        continue;
      }

      if (stat.size > MAX_SQL_FILE_BYTES) {
        warnings.push(`Skipping ${filePath}, target exceeds ${MAX_SQL_FILE_BYTES} bytes`)
        continue;
      }

      if (currentQueries.length && (stat.size + currentBatchBytes > MAX_BATCH_BYTES || currentBatchRows + 1 > MAX_BATCH_ROWS)) {
        await client.queries.import(currentQueries);
        currentBatchBytes = 0;
        currentBatchRows = 0;
        currentQueries = [];
      }

      const fileContents = await fs.readFile(filePath, { encoding: 'utf-8' });

      if (fileContents.length > 2_000_000) {
        warnings.push(`Skipping ${filePath}, target exceeds length 2000000 characters`);
        continue;
      }

      const query: ISavedQuery = {
        queryFolderId: parent.id,
        title: fileName,
        text: fileContents
      } as ISavedQuery;

      currentQueries.push(query);
      currentBatchBytes += stat.size;
      currentBatchRows += 1;
    }

    if (currentQueries && currentQueries.length > 0) {
      await client.queries.import(currentQueries);
    }
  }

  {
    const childDirNames = await getDirChildren(dir, true);

    for (const child of childDirNames) {
      const dirPath = path.join(dir, child);

      const childWarnings = await importDirectory(client, dirPath, parent.id);
      if (childWarnings.length) {
        warnings.push(...childWarnings);
      }
    }
  }

  return warnings;
}

async function getDirChildren(dir: string, isDir: boolean): Promise<string[]>{
  const children: string[] = []
  for await (const d of await fs.opendir(dir)) {
    if (d.isDirectory() === isDir) {
      children.push(d.name);
    } else if (d.isFile() === !isDir) {
      children.push(d.name)
    }
  }

  return children;
}
