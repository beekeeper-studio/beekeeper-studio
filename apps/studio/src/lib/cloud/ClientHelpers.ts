import { AxiosResponse } from 'axios';
import _ from 'lodash';


export interface CloudResponseBase {
  code: number,
  errors: [],
  message: string | null,
}

export class CloudError extends Error {
  public status: number
  public errors: string[]
  constructor(status: number, message?: string, errors?: any[]) {
    const result = [`Cloud Error (${status}):`]
    const errorStrings: string[] = errors ? errors.map((e) => {
      return _.isString(e) ? e : e.message
    }) : []
    if (message) result.push(message)
    if (errors?.length) result.push(...errorStrings)
    super(result.join(" "))
    this.status = status
    this.errors = errorStrings
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
