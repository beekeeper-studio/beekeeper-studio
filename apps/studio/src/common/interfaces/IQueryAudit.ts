export interface IQueryAuditUser {
  id?: number
  name?: string
  email?: string
  username?: string
}

export interface IQueryAudit {
  id: number
  revision: number
  action: 'create' | 'update' | 'destroy'
  createdAt: Date
  user: IQueryAuditUser
}

export interface IQueryAuditValues {
  title: string
  text: string
}

export interface IQueryAuditChangeSize {
  added: number
  removed: number
}

export interface IQueryAuditDetail extends IQueryAudit {
  previousAuditId: number | null
  values: IQueryAuditValues
  changedFields: string[]
  changes: Record<string, IQueryAuditChangeSize>
}
