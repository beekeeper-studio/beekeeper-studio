import IPluginData from "@/common/interfaces/IPluginData";
import { GenericController } from "@/lib/cloud/controllers/GenericController";

export class PluginDataController extends GenericController<IPluginData> {
  name = "pluginDatum";
  plural = "pluginData";
  path = "/plugin_data";
}
