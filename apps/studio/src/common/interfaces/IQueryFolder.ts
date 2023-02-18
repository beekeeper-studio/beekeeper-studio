

export interface IFolder {
  id: number | null
  name: string
  description?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export type IQueryFolder = IFolder

export type IConnectionFolder = IFolder