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

// Accept any 2xx status as success. POST (create) returns 201, GET/PATCH return 200,
// so checking for exactly 200 would incorrectly reject successful creates.
export function res<T extends CloudResponseBase>(response: AxiosResponse < T >, key: string) {
  if (response.status < 200 || response.status >= 300) throw new CloudError(response.status, response.data?.message, response.data?.errors)
  return response.data[key]
}
