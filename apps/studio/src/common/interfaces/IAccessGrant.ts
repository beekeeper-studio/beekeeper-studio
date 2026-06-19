export type AccessGrantSubjectType =
  | 'Connection'
  | 'ConnectionFolder'
  | 'Query'
  | 'QueryFolder'

export interface IAccessGrant {
  id: number | null
  subjectType: AccessGrantSubjectType
  subjectId: number
  membershipId: number
  userName: string
  canRead: boolean
  canWrite: boolean
}
