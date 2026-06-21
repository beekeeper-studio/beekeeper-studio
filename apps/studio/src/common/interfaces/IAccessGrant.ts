import { IMembership } from "./IMembership";

export type AccessGrantSubjectType =
  | 'Connection'
  | 'ConnectionFolder'
  | 'Query'
  | 'QueryFolder';

export interface IAccessGrant {
  id: number | null;
  subjectType: AccessGrantSubjectType;
  subjectId: number;
  membershipId: number;
  membership: IMembership;
  canRead: boolean;
  canWrite: boolean;
}
