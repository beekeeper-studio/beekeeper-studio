import { AxiosInstance } from 'axios'
import ISavedQuery from '@/common/interfaces/ISavedQuery'
import { IQueryAudit, IQueryAuditDetail } from '@/common/interfaces/IQueryAudit'
import { res, url } from '@/lib/cloud/ClientHelpers'

// Audits are nested under a query (/queries/:id/audits) and `get` needs both
// ids, so this can't extend GenericController; it follows the same
// name/plural/path convention as the other controllers.
export class QueryAuditsController {
  constructor(protected axios: AxiosInstance) {}

  name = 'audit'
  plural = 'audits'
  path = '/queries'

  async list(queryId: number): Promise<IQueryAudit[]> {
    const response = await this.axios.get(url(this.path, queryId, this.plural))
    return res(response, this.plural)
  }

  async get(queryId: number, auditId: number): Promise<IQueryAuditDetail> {
    const response = await this.axios.get(url(this.path, queryId, this.plural, auditId))
    return res(response, this.name)
  }

  async restore(queryId: number, auditId: number): Promise<ISavedQuery> {
    const response = await this.axios.post(url(this.path, queryId, this.plural, auditId, 'restore'), {})
    return res(response, 'query')
  }
}
