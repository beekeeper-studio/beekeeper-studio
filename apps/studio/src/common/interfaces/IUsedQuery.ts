import type { QueryOrigin } from './QueryOrigin'

export default interface IUsedQuery {
  id: number | null
  text: string
  excerpt: string
  createdAt: Date | number | null
  updatedAt: Date | number | null
  connectionId: number | null
  queryId: number | null
  // The cloud backend does not support query origins, so cloud history may omit these fields.
  origin?: QueryOrigin
  pluginId?: string | null
}
