import { IShareable } from "./IShareable"
import { IAccessGrant } from "./IAccessGrant"

export interface IFolder extends IShareable {
  id: number | null
  name: string
  expanded?: boolean
  parentId?: number | null
  description?: string | null
  createdAt?: Date
  updatedAt?: Date
  accessGrants?: IAccessGrant[]
}

export type IQueryFolder = IFolder

export type IConnectionFolder = IFolder