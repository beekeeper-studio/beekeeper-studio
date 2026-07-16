import ISavedQuery from '@/common/interfaces/ISavedQuery'
import { GenericController } from '@/lib/cloud/controllers/GenericController'
import { AccessGrantsController } from "@/lib/cloud/controllers/AccessGrantsController";
import { res, url } from "@/lib/cloud/ClientHelpers";

export interface ReorderResult {
  id: number;
  position: number;
  queryFolderId: number;
  updatedAt: number;
}

export class QueriesController extends GenericController<ISavedQuery> {
  name = 'query' as const
  plural = 'queries'
  path = '/queries'

  accessGrantsOf(queryId: number) {
    return new AccessGrantsController(this.axios, this.path, queryId);
  }

  async reorder(id: number, position: { before?: number | null; after?: number } | number, queryFolderId?: number | null): Promise<ReorderResult[]> {
    const response = await this.axios.patch(url(this.path, id, 'reorder'), {
      position,
      queryFolderId
    })
    return res(response, 'queries')
  }
}