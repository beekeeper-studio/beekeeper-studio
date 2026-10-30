import { IShareable } from "./IShareable"

export default interface ISavedQuery extends IShareable {
  id: number | null
  name: string
  text: string
  excerpt: string
  database: string | null
  queryFolderId?: number | null
  position?: number
  createdAt: Date | number | null
  updatedAt: Date | number | null
}
