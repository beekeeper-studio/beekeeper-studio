import { having } from "@/common/utils";
import { CloudClient } from "@/lib/cloud/CloudClient";
import _ from "lodash";

export type ClientError = Error | string | Error[] | string[] | null

interface BasicContext {
  state: {
    loading: boolean
    error: ClientError
  }
  rootState: {
    cloudClient: CloudClient | null
  }
  commit(str: string, item: any)
}

export function havingCli<U>(context: BasicContext, f: (c: CloudClient) => Promise<U>) {
  return having(context.rootState.cloudClient, f, "You are not logged in")
}

export function safelyDo<U>(context: BasicContext, f: (c: CloudClient) => Promise<U>) {
  
  const safeRunner = async (c: CloudClient) => {
    try {
      context.commit('loading', true)
      await f(c)
    } catch (error) {
      context.commit('error', error)
    } finally {
      context.commit('loading', false)
    }
  }
  return havingCli(context, safeRunner)
}

interface HasID {
  id?: number | string
}

export function upsert<T extends HasID>(list: T[], item: T) {
  const found = _.find(list, (q: T) => q.id === item.id)
  if (found) {
    // we do this so that the object itself stays the
    Object.assign(found, item)
  } else {
    list.unshift(item)
  }


}