import { IShareable } from "./IShareable"
import { IAccessGrant } from "./IAccessGrant"
import { Transport } from "../transport"

export interface IFolder extends IShareable, Transport {
  id: number | null
  name: string
  parentId: number | null
  description?: string | null
  accessGrants?: IAccessGrant[]
  /** Is it a personal folder? */
  personal: boolean;
  /** A default folder is made by the system */
  default: boolean;
}

export type IQueryFolder = IFolder

export type IConnectionFolder = IFolder
