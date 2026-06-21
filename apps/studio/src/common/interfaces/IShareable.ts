import { IAccessGrant } from "./IAccessGrant";
import { IMembership } from "./IMembership";

export interface IShareable {
  id: number | null;
  name: string;
  /** Can my team read this? */
  teamRead: boolean;
  /** Can my team write this? */
  teamWrite: boolean;
  /** Can I read this? */
  canRead: boolean;
  /** Can I write this? */
  canWrite: boolean;
  /** Can I manage the share settings? */
  canManage: boolean;
  /** Am I given an access grant? */
  accessGrant: IAccessGrant | null;
  /** The user who created this */
  membership: IMembership;
}
