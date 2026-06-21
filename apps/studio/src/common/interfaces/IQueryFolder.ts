import { IShareable } from "./IShareable"

export interface IFolder extends IShareable {
  id: number | null
  name: string
  expanded?: boolean
  parentId?: number | null
  description?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export type IQueryFolder = IFolder

export type IConnectionFolder = IFolder