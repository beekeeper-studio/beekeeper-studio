import { IWorkspace } from '@/common/interfaces/IWorkspace';
import { GenericController } from './GenericController';

export class WorkspacesController extends GenericController<IWorkspace> {
  name = 'workspace'
  plural = 'workspaces'
  path = '/workspaces'
}
