

export default interface ISavedQuery {
  id: number | null
  title: string
  // same as title, damn you title
  text: string
  excerpt: string
  database: string | null
  queryFolderId?: number | null
  createdAt: Date | number | null
  updatedAt: Date | null
  user?: {
    id: number
    name: string
  }

}
