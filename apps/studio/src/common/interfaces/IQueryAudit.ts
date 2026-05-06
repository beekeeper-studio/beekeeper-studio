export interface IQueryAuditUser {
  id?: number
  name?: string
  email?: string
  username?: string
}

export interface IQueryAudit {
  id: number
  version: number
  action: 'create' | 'update' | 'destroy'
  createdAt: number
  user: IQueryAuditUser
}

export interface IQueryAuditSnapshot {
  title: string
  text: string
  queryFolderId: number | null
}

export interface IQueryAuditDetail extends IQueryAudit {
  snapshot: IQueryAuditSnapshot
  changes: Record<string, unknown>
}
