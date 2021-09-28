import axios, { AxiosInstance} from 'axios'
import { res } from './ClientHelpers';
import { QueriesController } from "./controllers/QueriesController";
import { WorkspacesController } from './controllers/WorkspacesController';




export interface CloudClientOptions {
  token: string,
  app: string,
  email: string
  baseUrl: string,
  workspace?: number
}

export class CloudClient {

  static async login(baseUrl, email, password, app): Promise<string> {
    const cli = axios.create({
      baseURL: baseUrl,
      timeout: 5000
    })

    const response = await cli.post('/api/login', {
      email, password, app
    })

    return res(response, 'token')
  }


  axios: AxiosInstance
  public queries: QueriesController
  public workspaces: WorkspacesController
  public workspaceId: number
  constructor(public options: CloudClientOptions) {
    this.axios = axios.create({
      baseURL: `${options.baseUrl}/api`,
      timeout: 5000,
      headers: {
        email: options.email,
        token: options.token,
        app: options.app
      },
    })
    this.queries = new QueriesController(this.axios)
    this.workspaces = new WorkspacesController(this.axios)
  }

  setWorkspace(workspaceId: number) {
    this.workspaceId = workspaceId
    this.axios.defaults.params['workspace_id'] = workspaceId
  }

}