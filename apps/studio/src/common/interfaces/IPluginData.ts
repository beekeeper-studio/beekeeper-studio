export default interface IPluginData {
  id: number | null
  pluginId: string
  workspaceId: number
  connectionId: number | null
  key: string
  value: string
  createdAt?: Date | number | null
  updatedAt?: Date | null
}
