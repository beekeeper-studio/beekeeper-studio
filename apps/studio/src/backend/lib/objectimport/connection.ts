import { ICloudSavedConnection } from "@/common/interfaces/IConnection";
import { MAX_BATCH_BYTES, MAX_BATCH_ROWS, ObjectDescriptor, ObjectImporter } from "./import";
import { IFolder } from "@/common/interfaces/IQueryFolder";
import { AppDbHandlers } from "@/handlers/appDbHandlers";
import { promises as fs } from "fs";
import path from "path";

export class ConnectionImporter extends ObjectImporter<ICloudSavedConnection> {
    async importFolders(folders: IFolder[]): Promise<IFolder[]> {
      if (this.client) {
        return await this.client.connectionFolders.import(folders);
      } else {
        return await AppDbHandlers['appdb/connectionFolders/save']({ obj: folders, options: {} });
      }
    }
    async importItems(items: ICloudSavedConnection[]): Promise<ICloudSavedConnection[]> {
      if (this.client) {
        return await this.client.connections.import(items);
      } else {
        return await AppDbHandlers['appdb/saved/save']({ obj: items, options: {} });
      }
    }

    async readObjectFromPath(dir: string, name: string, parentId?: number): Promise<ObjectDescriptor<ICloudSavedConnection>> {
      const filePath = path.join(dir, name);
      const stat = await fs.stat(filePath);

      if(!stat.isFile()) {
        this.stats.warnings.push(`Skipping ${filePath}, is not a file`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.json') {
        this.stats.warnings.push(`Skipping ${filePath}, only .json files are allowed for connection import. Got "${ext || '(none)'}"`);
        return;
      }

      if (this.currentBatch.length && (stat.size + this.currentBatchBytes > MAX_BATCH_BYTES || this.currentBatch.length + 1 > MAX_BATCH_ROWS)) {
        this.batchFull = true;
      }

      const fileContents = await fs.readFile(filePath, { encoding: 'utf-8' });

      let obj: ICloudSavedConnection;

      try {
        obj = JSON.parse(fileContents);
      } catch (e) {
        this.stats.warnings.push(`Failed to parse json for ${filePath}. ${e.message ?? ''}`);
        return;
      }

      if (parentId) {
        obj.connectionFolderId = parentId;
      }

      const desc: ObjectDescriptor<ICloudSavedConnection> = {
        obj: obj,
        size: stat.size
      };

      return desc;
    }

}
