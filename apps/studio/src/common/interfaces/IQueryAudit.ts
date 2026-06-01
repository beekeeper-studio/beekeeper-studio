export interface IQueryAudit {
  id: number
  revision: number
  action: 'create' | 'update' | 'destroy'
  createdAt: Date | number
  user:
    | {
        source: "cloud"
        id: number
        name: string
        email: string
        username: string
      }
    | { source: "util" }
}

export interface IQueryAuditValues {
  title: string
  text: string
}

export interface IQueryAuditDetail extends IQueryAudit {
  previousAuditId: number | null
  values: IQueryAuditValues
}
