import { ICloudSavedConnection } from "@/common/interfaces/IConnection";
import { GenericController } from "@/lib/cloud/controllers/GenericController";
import { res, url } from "@/lib/cloud/ClientHelpers";

export interface ReorderResult {
  id: number;
  position: number;
  connectionFolderId: number;
  updatedAt: number;
}

export class ConnectionsController extends GenericController<ICloudSavedConnection> {
  name = 'connection'
  plural = 'connections'
  path = '/connections'

  async upsert(q: ICloudSavedConnection): Promise<ICloudSavedConnection> {
    return super.upsert(this.stripKeyfilePasswordIfDisabled(q))
  }

  async create(q: ICloudSavedConnection): Promise<ICloudSavedConnection> {
    return super.create(this.stripKeyfilePasswordIfDisabled(q))
  }

  async update(q: ICloudSavedConnection): Promise<ICloudSavedConnection> {
    return super.update(this.stripKeyfilePasswordIfDisabled(q))
  }

  async reorder(id: number, position: { before?: number | null; after?: number } | number, connectionFolderId?: number | null): Promise<ReorderResult[]> {
    const response = await this.axios.patch(url(this.path, id, 'reorder'), {
      position,
      connectionFolderId
    })
    return res(response, 'connections')
  }

  private stripKeyfilePasswordIfDisabled(q: ICloudSavedConnection): ICloudSavedConnection {
    if (q.sshStoreKeyfilePassword !== false || !q.sshConfigs?.length) return q
    return {
      ...q,
      sshConfigs: q.sshConfigs.map(csc => ({
        ...csc,
        sshConfig: { ...csc.sshConfig, keyfilePassword: null },
      })),
    }
  }
}