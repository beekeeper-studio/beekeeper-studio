import { AxiosResponse } from 'axios'


export interface CloudResponseBase {
  code: number,
  errors: [],
  message: string | null,
}

export class CloudError extends Error {
  public status: number
  public errors: string[]
  constructor(status: number, message?: string, errors?: string[]) {
    const result = [`Cloud error [${status}]:`]
    if (message) result.push(message)
    if (errors?.length) result.push(...errors)
    super(result.join(" "))
    this.status = status
    this.errors = errors
  }
}

export function url(...parts: (string | number)[]) {
  const res = parts.map((p) => p.toString()).join("/")
  return res.startsWith('/') ? res : `/${res}`
}

export function res<T extends CloudResponseBase>(response: AxiosResponse < T >, key: string) {
  console.log('creating result from - ', response)
  if (response.status !== 200) throw new CloudError(response.status, response.data?.message, response.data?.errors)
  return response.data[key]
}