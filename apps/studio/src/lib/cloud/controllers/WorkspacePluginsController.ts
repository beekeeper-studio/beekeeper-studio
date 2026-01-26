import IWorkspacePlugin from '@/common/interfaces/IWorkspacePlugin'
import { GenericController } from '@/lib/cloud/controllers/GenericController'

export class WorkspacePluginsController extends GenericController<IWorkspacePlugin> {
  name = 'workspacePlugin'
  plural = 'workspacePlugins'
  path = '/workspace_plugins'
}
