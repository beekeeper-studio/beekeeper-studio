import { HasId } from "@/common/interfaces/IGeneric";
import { having } from "@/common/utils";
import { CloudClient } from "@/lib/cloud/CloudClient";
import _ from "lodash";

export type ClientError = Error | string | Error[] | string[] | null

interface BasicContext {
  state: {
    loading: boolean
    error: ClientError
  }
  rootGetters: {
    cloudClient: CloudClient | null
  }
  commit(str: string, item: any)
}

export function havingCli<U>(context: BasicContext, f: (c: CloudClient) => Promise<U>) {
  return having(context.rootGetters.cloudClient, f, "You are not logged in")
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

export async function safely<U>(context: BasicContext, f: () => Promise<U>) {
  try {
    context.commit('loading', true)
    await f()
  } catch (error) {
    context.commit('error', error)
  } finally {
    context.commit('loading', false)
  }
}


export function upsert<T extends HasId>(list: T[], item: T) {
  const found = _.find(list, (q: T) => q.id === item.id)
  if (found) {
    // we do this so that the object itself stays the same
    Object.assign(found, item)
  } else {
    list.unshift(item)
  }
}