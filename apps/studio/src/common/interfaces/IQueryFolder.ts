import { IShareable } from "./IShareable"
import { IAccessGrant } from "./IAccessGrant"
import { Folderable } from "@beekeeperstudio/ui-kit";

export interface IFolder extends IShareable, Folderable {
  id: number | null
  name: string
  parentId: number | null
  description?: string | null
  createdAt?: Date
  updatedAt?: Date
  accessGrants?: IAccessGrant[]
  /** Is it a personal folder? */
  personal: boolean;
}

export type IQueryFolder = IFolder

export type IConnectionFolder = IFolder
