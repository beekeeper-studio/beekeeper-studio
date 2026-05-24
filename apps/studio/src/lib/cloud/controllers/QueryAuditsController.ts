import { AxiosInstance } from 'axios'
import ISavedQuery from '@/common/interfaces/ISavedQuery'
import { IQueryAudit, IQueryAuditDetail } from '@/common/interfaces/IQueryAudit'
import { res, url } from '@/lib/cloud/ClientHelpers'

export class QueryAuditsController {
  constructor(protected axios: AxiosInstance) {}

  async list(queryId: number): Promise<IQueryAudit[]> {
    const response = await this.axios.get(url('/queries', queryId, 'audits'))
    return res(response, 'audits')
  }

  async get(queryId: number, auditId: number): Promise<IQueryAuditDetail> {
    const response = await this.axios.get(url('/queries', queryId, 'audits', auditId))
    return res(response, 'audit')
  }

  async restore(queryId: number, auditId: number): Promise<ISavedQuery> {
    const response = await this.axios.post(url('/queries', queryId, 'audits', auditId, 'restore'), {})
    return res(response, 'query')
  }
}
