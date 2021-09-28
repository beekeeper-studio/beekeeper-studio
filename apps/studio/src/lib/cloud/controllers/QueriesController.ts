
import ISavedQuery from '@/common/interfaces/ISavedQuery'
import { AxiosInstance, AxiosResponse } from 'axios'
import { CloudError, CloudResponseBase, res } from '../ClientHelpers'

interface QueriesResponse extends CloudResponseBase {
  queries: ISavedQuery[]
}

export class QueriesController {
  constructor(private axios: AxiosInstance){

  }

  async list(): Promise<ISavedQuery[]> {
    const response: AxiosResponse<QueriesResponse> = await this.axios.get('/queries')
    return res(response, 'queries')
  }

  async create(q: ISavedQuery): Promise<ISavedQuery> {
    if (q.id) throw new CloudError(400, "Cannot create - query already has an ID")

    const response = await this.axios.post('/queries', q)
    return res(response, 'query')
  }

  async update(q: ISavedQuery): Promise<ISavedQuery> {
    if (!q.id) throw new CloudError(400, "Must provide Query ID to update a query.")
    const response = await this.axios.patch(`/queries/${q.id}`, q)
    return res(response, 'query')
  }

  async upsert(q: ISavedQuery): Promise<ISavedQuery> {
    const method = q.id ? this.update : this.create
    return await method(q)
  }

  async delete(q: ISavedQuery): Promise<boolean> {
    if (!q.id) throw new CloudError(400, "Cannot delete a query without an ID")
    const response = await this.axios.delete(`/queries/${q.id}`)
    return res(response, 'success')
  }
}