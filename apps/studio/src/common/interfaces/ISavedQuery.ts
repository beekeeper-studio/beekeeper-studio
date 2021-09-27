

export default interface ISavedQuery {
  id: number | null
  title: string
  text: string
  database: string | null
  // TODO (matthew)
  // queryFolderId: number | null
  // userId: number | null
  createdAt: Date | null
  updatedAt: Date | null

}