import { ICloudSavedConnection } from "@/common/interfaces/IConnection";
import { GenericController } from "@/lib/cloud/controllers/GenericController";
import { AccessGrantsController } from "@/lib/cloud/controllers/AccessGrantsController";
import { res, url } from "@/lib/cloud/ClientHelpers";

export interface ReorderResult {
  id: number;
  position: number;
  connectionFolderId: number;
  updatedAt: number;
}

export class ConnectionsController extends GenericController<ICloudSavedConnection> {
  name = 'connection' as const
  plural = 'connections'
  path = '/connections'

  accessGrantsOf(connectionId: number) {
    return new AccessGrantsController(this.axios, this.path, connectionId);
  }

  async reorder(id: number, position: { before?: number | null; after?: number } | number, connectionFolderId?: number | null): Promise<ReorderResult[]> {
    const response = await this.axios.patch(url(this.path, id, 'reorder'), {
      position,
      connectionFolderId
    })
    return res(response, 'connections')
  }
}