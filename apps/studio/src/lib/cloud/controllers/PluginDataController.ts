import IPluginData from '@/common/interfaces/IPluginData'
import { GenericController } from '@/lib/cloud/controllers/GenericController'

export class PluginDataController extends GenericController<IPluginData> {
  name = 'pluginData'
  plural = 'pluginData'
  path = '/plugin_data'
}
