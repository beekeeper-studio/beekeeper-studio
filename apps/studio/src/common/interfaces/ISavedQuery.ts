import { IShareable } from "./IShareable"

export default interface ISavedQuery extends IShareable {
  id: number | null
  title: string
  // same as title, damn you title
  text: string
  excerpt: string
  database: string | null
  queryFolderId?: number | null
  position?: number
  createdAt: Date | number | null
  updatedAt: Date | null
}
