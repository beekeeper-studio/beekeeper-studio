import { CloudCredential } from "@/common/appdb/models/CloudCredential"
import { CloudClient, CloudClientOptions } from "@/lib/cloud/CloudClient";
import platformInfo from '@/common/platform_info';
import { state } from "./handlerState";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import path from 'path';
import { promises as fs } from 'fs';
import { IQueryFolder } from "@/common/interfaces/IQueryFolder";
import { IDirectoryImportStats } from "@/common/interfaces/IDirectoryImportStats";
import rawLog from "@bksLogger";
import { AppDbHandlers } from "./appDbHandlers";
import { LocalWorkspace } from "@/common/interfaces/IWorkspace";

const log = rawLog.scope("workspaceHandlers")

// TEMP (@day): we need a better place for these
// queries are limited to 2_000_000 characters, so the upper limit is 4x that amount
const MAX_SQL_FILE_BYTES = 4 * 2_000_000;
const SQL_FILE_EXTENSIONS = new Set(['.sql', '.txt']);

const SKIP_DIR_NAMES = new Set(['.git']);

// I am just assuming that big batches might be an issue, so we have the ability to cap here
// as well as cap the amount of rows so we don't piss off the active record transaction
// I'm also not sure what size the cloud can actually handle
const MAX_BATCH_BYTES = 50 * 1024 * 1024;
const MAX_BATCH_ROWS = 100;

interface ImportFunctions {
  importFolders(folders: IQueryFolder[]): Promise<IQueryFolder[]>,
  importQueries(queries: ISavedQuery[]): Promise<ISavedQuery[]>,
}

export interface IWorkspaceHandlers {
  "workspace/setActive": ({ sId, wId, credentialId }: { sId: string, wId: number, credentialId: number }) => Promise<void>,
  "workspace/importDirectory": ({ sId, dir, parentId, preserveRoot }: { sId: string, dir: string, parentId: number, preserveRoot: boolean }) => Promise<IDirectoryImportStats>
}

export const WorkspaceHandlers: IWorkspaceHandlers = {
  "workspace/setActive": async function({ sId, wId, credentialId }: { sId: string, wId: number, credentialId: number }): Promise<void> {
    if (wId === LocalWorkspace.id) {
      state(sId).cloudClient = null;
      return;
    }

    const cred = await CloudCredential.findOneBy({ id: credentialId });

    if (!cred) {
      throw new Error('Could not find matching credential for id when setting workspace');
    }

    const options: CloudClientOptions = {
      app: cred.appId,
      email: cred.email,
      token: cred.token,
      baseUrl: platformInfo.cloudUrl,
      clientVersion: platformInfo.appVersion,
      workspace: wId,
    };

    const client = new CloudClient(options);
    state(sId).cloudClient = client;
  },
  'workspace/importDirectory': async function({ dir, parentId, sId, preserveRoot }: { dir: string, parentId: number, sId: string, preserveRoot: boolean }): Promise<IDirectoryImportStats> {
    if (typeof dir !== 'string' || dir.length === 0) {
      // throw?
    }

    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      throw new Error('file/importDirectory called with non directory path');
    }

    const funcs = getImportFuncs(sId);

    const stats = await importDirectory(funcs, dir, parentId, preserveRoot);

    return stats;
  }
}

function getImportFuncs(sId: string): ImportFunctions {
  const client = state(sId).cloudClient;
  if (client) {
    return {
      importFolders: (folders: IQueryFolder[]) => {
        return client.queryFolders.import(folders);
      },
      importQueries: (queries: ISavedQuery[]) => {
        return client.queries.import(queries)
      }
    }
  } else {
    return {
      importFolders: (folders: IQueryFolder[]) => {
        return AppDbHandlers["appdb/queryFolder/save"]({ obj: folders, options: {} })
      },
      importQueries: (queries: ISavedQuery[]) => {
        return AppDbHandlers["appdb/query/save"]({ obj: queries, options: {} })
      }
    }
  }
}

async function importDirectory(funcs: ImportFunctions, dir: string, parentId: number | null, importDir: boolean = true): Promise<IDirectoryImportStats> {
  const stats: IDirectoryImportStats = {
    warnings: [],
    directories: 0,
    queries: 0
  }

  if (importDir) {
    let parent: IQueryFolder = {
      id: null,
      name: path.basename(dir),
      parentId
    } as IQueryFolder;


    try {
      log.info('IMPORTING: ', parent);
      [parent] = await funcs.importFolders([parent]);

      stats.directories += 1;
      parentId = parent.id;
    } catch (e) {
      log.error(e);
      stats.warnings.push(`Failed to import directory ${parent.name}. ${e.message}`);
      return stats;
    }
  }

  {
    const childFileNames = await getDirChildren(dir, false);

    let currentBatchBytes = 0;
    let currentBatchRows = 0;
    let currentQueries: ISavedQuery[] = []

    for (const fileName of childFileNames) {
      const filePath = path.join(dir, fileName);

      const stat = await fs.stat(filePath);

      if (!stat.isFile()) {
        stats.warnings.push(`Skipping ${filePath}, is not a file`)
        continue;
      }

      const ext = path.extname(filePath).toLowerCase();
      if (!SQL_FILE_EXTENSIONS.has(ext)) {
        const allowed = [...SQL_FILE_EXTENSIONS].join(', ');
        stats.warnings.push(`Skipping ${filePath}, only ${allowed} files are allowed, got "${ext || '(none)'}"`);
        continue;
      }

      if (stat.size > MAX_SQL_FILE_BYTES) {
        stats.warnings.push(`Skipping ${filePath}, target exceeds ${MAX_SQL_FILE_BYTES} bytes`)
        continue;
      }

      if (currentQueries.length && (stat.size + currentBatchBytes > MAX_BATCH_BYTES || currentBatchRows + 1 > MAX_BATCH_ROWS)) {
        try {
          await funcs.importQueries(currentQueries);
          stats.queries += currentQueries.length;
        } catch (e) {
          stats.warnings.push(`Failed to import ${currentQueries.length} queries: ${e.message}`)
        }
        currentBatchBytes = 0;
        currentBatchRows = 0;
        currentQueries = [];
      }

      const fileContents = await fs.readFile(filePath, { encoding: 'utf-8' });

      if (fileContents.length > 2_000_000) {
        stats.warnings.push(`Skipping ${filePath}, target exceeds length 2000000 characters`);
        continue;
      }

      const query: ISavedQuery = {
        queryFolderId: parentId,
        title: fileName,
        text: fileContents
      } as ISavedQuery;

      currentQueries.push(query);
      currentBatchBytes += stat.size;
      currentBatchRows += 1;
    }

    if (currentQueries && currentQueries.length > 0) {
      try {
        await funcs.importQueries(currentQueries);
        stats.queries += currentQueries.length;
      } catch (e) {
        stats.warnings.push(`Failed to import ${currentQueries.length} queries: ${e.message}`)
      }

    }
  }

  {
    const childDirNames = await getDirChildren(dir, true);

    for (const child of childDirNames) {
      if (!SKIP_DIR_NAMES.has(child)) {
        const dirPath = path.join(dir, child);

        const childStats = await importDirectory(funcs, dirPath, parentId);

        stats.queries += childStats.queries;
        stats.directories += childStats.directories;
        if (childStats.warnings.length) {
          stats.warnings.push(...childStats.warnings);
        }
      } else {
        stats.warnings.push(`Skipping folder: ${child}`);
      }
    }
  }

  return stats;
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
