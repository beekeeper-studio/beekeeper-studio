import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { MAX_BATCH_BYTES, MAX_BATCH_ROWS, MAX_SQL_FILE_BYTES, MAX_SQL_FILE_LENGTH, ObjectDescriptor, ObjectImporter, SQL_FILE_EXTENSIONS } from "./import";
import { IFolder } from "@/common/interfaces/IQueryFolder";
import { promises as fs } from "fs";
import path from "path";
import _ from "lodash";
import { AppDbHandlers } from "@/handlers/appDbHandlers";


export class QueryImporter extends ObjectImporter<ISavedQuery> {
  async importFolders(folders: IFolder[]): Promise<IFolder[]> {
    if (this.client) {
      return this.client.queryFolders.import(folders);
    } else {
      return AppDbHandlers[`appdb/queryFolder/save`]({ obj: folders, options: {} });
    }
  }

  async importItems(items: ISavedQuery[]): Promise<ISavedQuery[]> {
    if (this.client) {
      return await this.client.queries.import(items);
    } else {
      return await AppDbHandlers[`appdb/query/save`]({ obj: items, options: {} });
    }
  }

  async readObjectFromPath(dir: string, name: string, parentId?: number): Promise<ObjectDescriptor<ISavedQuery>> {
    const filePath = path.join(dir, name);

    const stat = await fs.stat(filePath);

    if (!stat.isFile()) {
      this.stats.warnings.push(`Skipping ${filePath}, is not a file`)
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!SQL_FILE_EXTENSIONS.has(ext)) {
      const allowed = [...SQL_FILE_EXTENSIONS].join(', ');
      this.stats.warnings.push(`Skipping ${filePath}, only ${allowed} files are allowed, got "${ext || '(none)'}"`);
      return;
    }

    if (stat.size > MAX_SQL_FILE_BYTES) {
      this.stats.warnings.push(`Skipping ${filePath}, target exceeds ${MAX_SQL_FILE_BYTES} bytes`)
      return;
    }

    if (this.currentBatch.length && (stat.size + this.currentBatchBytes > MAX_BATCH_BYTES || this.currentBatch.length + 1 > MAX_BATCH_ROWS)) {
      this.batchFull = true;
    }

    const fileContents = await fs.readFile(filePath, { encoding: 'utf-8'});

    if (fileContents.length > MAX_SQL_FILE_LENGTH) {
      this.stats.warnings.push(`Skipping ${filePath}, target exceeds length ${MAX_SQL_FILE_LENGTH} characters`);
      return;
    }

    const query: ISavedQuery = {
      queryFolderId: parentId,
      title: name,
      text: fileContents
    } as ISavedQuery;

    const desc: ObjectDescriptor<ISavedQuery> = {
      obj: query,
      size: stat.size
    };

    return desc;
  }

}
