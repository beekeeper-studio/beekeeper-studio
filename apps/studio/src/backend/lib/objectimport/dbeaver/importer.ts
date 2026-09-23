import { ICloudSavedConnection, IConnection } from '@/common/interfaces/IConnection';
import { IFolder } from '@/common/interfaces/IQueryFolder';
import { AppDbHandlers } from '@/handlers/appDbHandlers';
import { CloudClient } from '@/lib/cloud/CloudClient';
import rawLog from '@bksLogger';
import { ConnectionImporter } from '../connection';
import { mapDBeaverConnection, MappedConnection, stripSecrets } from './mapping';
import { readDBeaverSource } from './source';
import { DBeaverImportOptions, DBeaverImportPreview, DBeaverImportStats, DBeaverSource } from './types';

const log = rawLog.scope('DBeaverConnectionImporter');

const BATCH_SIZE = 50;

interface SourceConnection extends MappedConnection {
  key: string
  project: string
}

/**
 * Imports connections from a DBeaver workspace, project or project export into the
 * local app database, or into a cloud workspace when given a client.
 */
export class DBeaverConnectionImporter {
  private importer: ConnectionImporter;

  constructor(private client?: CloudClient) {
    this.importer = new ConnectionImporter(client);
  }

  async preview(sourcePath: string): Promise<DBeaverImportPreview> {
    const source = await readDBeaverSource(sourcePath);
    return {
      path: source.path,
      projects: source.projects.map((p) => p.name),
      warnings: source.warnings,
      connections: mapSource(source).map((c) => ({
        key: c.key,
        project: c.project,
        name: c.name,
        folder: c.folder,
        driver: c.driver,
        connectionType: c.connectionType,
        supported: !!c.connection,
        hasPassword: c.hasPassword,
        warnings: c.skipReason ? [c.skipReason, ...c.warnings] : c.warnings,
      })),
    };
  }

  async import(sourcePath: string, options: DBeaverImportOptions = {}): Promise<DBeaverImportStats> {
    const stats: DBeaverImportStats = { warnings: [], directories: 0, items: 0, skipped: 0 };
    const source = await readDBeaverSource(sourcePath);
    stats.warnings.push(...source.warnings);

    let connections = mapSource(source);
    if (options.keys) {
      const keys = new Set(options.keys);
      connections = connections.filter((c) => keys.has(c.key));
    }

    const importable: SourceConnection[] = [];
    for (const c of connections) {
      if (c.connection) {
        importable.push(c);
        stats.warnings.push(...c.warnings.map((w) => `${c.name}: ${w}`));
      } else {
        stats.skipped += 1;
        stats.warnings.push(`Skipped ${c.name}: ${c.skipReason}`);
      }
    }
    if (importable.length === 0) return stats;

    const includeFolders = options.includeFolders ?? true;
    const includePasswords = options.includePasswords ?? true;
    // one folder per DBeaver project, but only when there's more than one
    const projectFolders = new Set(importable.map((c) => c.project)).size > 1;
    const folders = new FolderTree(this.importer, await this.existingFolders(), options.parentId ?? null, stats);

    const items: { name: string, connection: Partial<IConnection> }[] = [];
    for (const c of importable) {
      const path = [
        ...(projectFolders ? [c.project] : []),
        ...(includeFolders && c.folder ? c.folder.split('/').filter((s) => s.trim()) : []),
      ];
      const connection = includePasswords ? { ...c.connection } : stripSecrets(c.connection);
      connection.connectionFolderId = await folders.resolve(path);
      items.push({ name: c.name, connection });
    }

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      await this.importBatch(items.slice(i, i + BATCH_SIZE), stats);
    }
    return stats;
  }

  private async importBatch(batch: { name: string, connection: Partial<IConnection> }[], stats: DBeaverImportStats) {
    try {
      await this.importer.importItems(batch.map((b) => b.connection as ICloudSavedConnection));
      stats.items += batch.length;
    } catch (e) {
      if (batch.length === 1) {
        log.error(`Failed to import ${batch[0].name}`, e);
        stats.warnings.push(`Failed to import ${batch[0].name}: ${e?.message ?? e}`);
        stats.skipped += 1;
        return;
      }
      // a batch is saved all-or-nothing, so retry one by one to keep the valid ones
      for (const item of batch) {
        await this.importBatch([item], stats);
      }
    }
  }

  private async existingFolders(): Promise<IFolder[]> {
    if (this.client) {
      return await this.client.connectionFolders.list();
    }
    return await AppDbHandlers['appdb/connectionFolder/find']({ options: {} });
  }
}

function mapSource(source: DBeaverSource): SourceConnection[] {
  const result: SourceConnection[] = [];
  for (const project of source.projects) {
    const defaultStorage = project.storages.find((s) => s.fileName === 'data-sources.json') ?? project.storages[0];
    for (const storage of project.storages) {
      for (const [id, conn] of Object.entries(storage.dataSources.connections ?? {})) {
        const mapped = mapDBeaverConnection(id, conn, { storage, defaultStorage });
        result.push({ ...mapped, key: `${project.name}/${id}`, project: project.name });
      }
    }
  }
  return result;
}

/** Creates folders on demand, reusing existing folders with the same name and parent. */
class FolderTree {
  private cache = new Map<string, number | null>();

  constructor(
    private importer: ConnectionImporter,
    private existing: IFolder[],
    private rootId: number | null,
    private stats: DBeaverImportStats
  ) {}

  async resolve(path: string[]): Promise<number | null> {
    let parentId = this.rootId;
    for (let depth = 1; depth <= path.length; depth++) {
      const key = path.slice(0, depth).join('/');
      if (!this.cache.has(key)) {
        this.cache.set(key, await this.findOrCreate(path[depth - 1], parentId));
      }
      parentId = this.cache.get(key);
    }
    return parentId;
  }

  private async findOrCreate(name: string, parentId: number | null): Promise<number | null> {
    const match = this.existing.find((f) => f.name === name && (f.parentId ?? null) === parentId);
    if (match) return match.id;
    try {
      const [folder] = await this.importer.importFolders([{ id: null, name, parentId } as IFolder]);
      this.existing.push(folder);
      this.stats.directories += 1;
      return folder.id;
    } catch (e) {
      log.error(`Failed to create folder ${name}`, e);
      this.stats.warnings.push(`Failed to create folder ${name}, its connections are imported into the parent folder: ${e?.message ?? e}`);
      return parentId;
    }
  }
}
