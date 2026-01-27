import IWorkspacePluginStorageItem from "@/common/interfaces/IWorkspacePluginStorageItem";
import { res, url } from "@/lib/cloud/ClientHelpers";
import { GenericController } from "@/lib/cloud/controllers/GenericController";

export class WorkspacePluginStorageController extends GenericController<IWorkspacePluginStorageItem> {
  name = "workspacePluginStorageItem";
  plural = "workspacePluginStorageItems";
  path = "/workspace_plugin_storage_items";

  /**
   * Create or update by key - PUT /workspace_plugin_storage_items/create_or_update_by_key
   * Creates if not exists, updates if exists. Finds by [workspace_id, plugin_id, key, connection_id].
   */
  async upsert(
    item: Omit<IWorkspacePluginStorageItem, "id" | "createdAt" | "updatedAt">
  ): Promise<IWorkspacePluginStorageItem> {
    const response = await this.axios.put(url(this.path, "upsert"), {
      [this.name]: item,
    });
    return res(response, this.name);
  }
}
