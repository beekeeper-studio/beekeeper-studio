import ISavedQuery from "@/common/interfaces/ISavedQuery";
import axios, { AxiosResponse, AxiosInstance} from 'axios'

class CloudError extends Error {
  constructor(status: number, message?: string, errors?: string[]) {
    const result = [`Cloud error [${status}]:`]
    if (message) result.push(message)
    if (errors?.length) result.push(...errors)
    super(result.join(" "))
  }
}


interface CloudResponseBase {
  code: number,
  errors: [],
  message: string | null,
}

interface QueriesResponse extends CloudResponseBase {
  queries: ISavedQuery[]
}

export interface CloudClientOptions {
  token: string,
  app: string,
  email: string
  baseUrl: string,
  workspace: number
}

export class CloudClient {
  axois: AxiosInstance
  constructor(public options: CloudClientOptions) {
    this.axois = axios.create({
      baseURL: `${options.baseUrl}/api`,
      timeout: 5000,
      headers: {
        email: options.email,
        token: options.token,
        app: options.app
      }
    })
  }

  async queriesList(): Promise<ISavedQuery[]> {
    const response: AxiosResponse<QueriesResponse> = await this.axois.get('/queries',{ params: { workspace_id: this.options.workspace}})
    return this.result(response, 'queries')
  }


  private result<T extends CloudResponseBase>(response: AxiosResponse<T>, key: string) {
    if (response.status !== 200) throw new CloudError(response.status, response.data?.message, response.data?.errors)
    return response.data[key]
  }


}