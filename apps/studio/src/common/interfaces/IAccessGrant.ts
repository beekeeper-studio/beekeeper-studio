import { IMembership } from "./IMembership";

export interface IAccessGrant {
  id: number | null;
  membershipId: number;
  membership: IMembership;
  canRead: boolean;
  canWrite: boolean;
}
