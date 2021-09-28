import { IWorkspace } from '@/common/interfaces/IWorkspace';
import { AxiosInstance } from 'axios'
import { res } from '../ClientHelpers';



export class WorkspacesController {
  constructor(private axios: AxiosInstance) {

  }

  async list(): Promise<IWorkspace[]> {
    const response = await this.axios.get('/workspaces')
    return res(response, 'workspaces')
  }
}