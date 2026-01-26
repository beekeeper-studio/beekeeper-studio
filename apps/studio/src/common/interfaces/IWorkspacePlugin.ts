export default interface IWorkspacePlugin {
  id: number | null
  pluginId: string
  key: string
  value: string
  createdAt?: Date | number | null
  updatedAt?: Date | null
}
