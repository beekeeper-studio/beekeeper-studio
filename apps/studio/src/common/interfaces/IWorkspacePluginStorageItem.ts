export default interface IWorkspacePluginStorageItem {
  id: number | null
  pluginId: string
  connectionId: number | null
  key: string
  value: string
  createdAt?: Date | number | null
  updatedAt?: Date | null
}
