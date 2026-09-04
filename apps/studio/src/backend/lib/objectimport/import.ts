import path from 'path';
import { promises as fs } from 'fs';
import { IObjectImportStats } from '@/common/interfaces/IObjectImportStats';
import { IFolder } from '@/common/interfaces/IQueryFolder';
import rawLog from '@bksLogger';
import { CloudClient } from '@/lib/cloud/CloudClient';

const log = rawLog.scope('ObjectImporter');

export const MAX_SQL_FILE_LENGTH = 2_000_000;
export const MAX_SQL_FILE_BYTES = 4 * MAX_SQL_FILE_LENGTH;
export const SQL_FILE_EXTENSIONS = new Set(['.sql', '.txt']);

export const SKIP_DIR_NAMES = new Set(['.git']);

// I am just assuming that big batches might be an issue, so we have the ability to cap here
// as well as cap the amount of rows so we don't piss off the active record transaction
// I'm also not sure what size the cloud can actually handle
export const MAX_BATCH_BYTES = 50 * 1024 * 1024;
export const MAX_BATCH_ROWS = 100;

export interface ObjectDescriptor<T> {
  obj: T,
  size: number
}

export abstract class ObjectImporter<T> {
  stats: IObjectImportStats = {
    warnings: [],
    directories: 0,
    items: 0
  };
  protected currentBatch: T[] = [];
  protected currentBatchBytes: number = 0;
  protected batchFull: boolean = false;

  constructor(protected client?: CloudClient) {

  }

  abstract importFolders(folders: IFolder[]): Promise<IFolder[]>;
  abstract importItems(items: T[]): Promise<T[]>;
  abstract readObjectFromPath(dir: string, name: string, parentId?: number): Promise<ObjectDescriptor<T>>;

  async importSelections(paths: string[], parentId: number): Promise<IObjectImportStats> {
    this.stats = {
      warnings: [],
      directories: 0,
      items: 0
    };

    this.currentBatch = [];
    this.currentBatchBytes = 0;

    for (const filePath of paths) {
      const dir = path.dirname(filePath);
      const name = path.basename(filePath);
      const desc = await this.readObjectFromPath(dir, name, parentId);

      if (this.batchFull) {
        await this.importCurrentBatch();
        this.batchFull = false;
      }

      await this.maybeAddToBatch(desc);
    }

    return this.stats;
  }

  async importDirectory(dir: string, parentId: number | null, importDir: boolean = true): Promise<IObjectImportStats> {
    this.stats = {
      warnings: [],
      directories: 0,
      items: 0
    };

    await this._import(dir, parentId, importDir);

    return this.stats;
  }

  private async _import(dir: string, parentId: number | null, importDir: boolean = true): Promise<void> {
    if (importDir) {
      let parent: IFolder = {
        id: null,
        name: path.basename(dir),
        parentId
      } as IFolder;

      try {
        [parent] = await this.importFolders([parent]);

        this.stats.directories += 1;
        parentId = parent.id;
      } catch (e) {
        log.error(e);
        this.stats.warnings.push(`Failed to import directory ${parent.name}. ${e.message}`);
        return;
      }
    }

    await this.importLevel(dir, parentId);

    const childDirNames = await this.getDirChildren(dir, true);

    for (const child of childDirNames) {
      if (!SKIP_DIR_NAMES.has(child)) {
        const dirPath = path.join(dir, child);

        await this._import(dirPath, parentId);
      } else {
        this.stats.warnings.push(`Skipping folder: ${child}`);
      }
    }
  }

  async getDirChildren(dir: string, isDir: boolean): Promise<string[]> {
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


  private async importLevel(dir: string, parentId?: number): Promise<void> {
    const childFileNames = await this.getDirChildren(dir, false);

    this.currentBatch = [];
    this.currentBatchBytes = 0;

    for (const fileName of childFileNames) {
      const desc = await this.readObjectFromPath(dir, fileName, parentId);

      if (this.batchFull) {
        await this.importCurrentBatch();
        this.batchFull = false;
      }

      await this.maybeAddToBatch(desc);
    }

    if (this.currentBatch && this.currentBatch.length > 0) {
      await this.importCurrentBatch();
    }
  }

  private async importCurrentBatch() {
    try {
      await this.importItems(this.currentBatch);
      this.stats.items += this.currentBatch.length;
    } catch (e) {
      this.stats.warnings.push(`Failed to import ${this.currentBatch.length} items: ${e.message}`);
    }

    this.currentBatch = [];
    this.currentBatchBytes = 0;
  }

  private async maybeAddToBatch(desc: ObjectDescriptor<T>) {
    if (!_.isNil(desc)) {
      this.currentBatch.push(desc.obj);

      this.currentBatchBytes += desc.size;
    }
  }

}
