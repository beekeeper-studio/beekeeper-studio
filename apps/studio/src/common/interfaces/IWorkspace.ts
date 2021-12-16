

export interface IWorkspace {
  id: number
  type: 'local' | 'cloud'
  name: string,
  logo?: string
  icon?: string
}

export const LocalWorkspace: IWorkspace = {
  // can never exist in a real database
  id: -1,
  type: 'local',
  name: 'Local Workspace',
  icon: 'laptop'

}