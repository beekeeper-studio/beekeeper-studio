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

  async reorder(id: number, position: { before?: number | null; after?: number } | number, connectionFolderId?: number | null): Promise<ReorderResult[]> {
    const response = await this.axios.patch(url(this.path, id, 'reorder'), {
      position,
      connectionFolderId
    })
    return res(response, 'connections')
  }
}