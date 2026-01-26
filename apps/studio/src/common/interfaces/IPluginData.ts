export default interface IPluginData {
  id: number | null
  pluginId: string
  key: string
  value: string
  createdAt?: Date | number | null
  updatedAt?: Date | null
}
