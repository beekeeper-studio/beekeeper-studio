

export interface IFolder {
  id: number | null
  name: string
  description?: string | null
  createdAt?: Date
  updatedAt?: Date
}

export interface IQueryFolder extends IFolder {
}

export interface IConnectionFolder extends IFolder {
  
}