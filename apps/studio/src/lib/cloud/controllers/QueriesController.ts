
import ISavedQuery from '@/common/interfaces/ISavedQuery'
import { GenericController } from '@/lib/cloud/controllers/GenericController'


export class QueriesController extends GenericController<ISavedQuery> {
  name = 'query'
  plural = 'queries'
  path = '/queries'
}