
import IUsedQuery from '@/common/interfaces/IUsedQuery'
import { GenericController } from '@/lib/cloud/controllers/GenericController'

export class UsedQueriesController extends GenericController<IUsedQuery> {
  name = 'usedQuery'
  plural = 'usedQueries'
  path = '/used_queries'
}
