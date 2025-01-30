import { HasId } from "@/common/interfaces/IGeneric";
import { having } from "@/common/utils";
import _ from "lodash";
import rawLog from '@bksLogger'

const log = rawLog.scope('StoreHelpers')
export type ClientError = Error | string | Error[] | string[] | null

interface BasicContext {
  state: {
    loading: boolean
    error: ClientError
  }
  rootGetters: {
    cloudClient: any | null
  }
  commit(str: string, item: any)
}

export function havingCli<U>(context: BasicContext, f: (c: any) => Promise<U>) {
  return having(context.rootGetters.cloudClient, f, "You are not logged in")
}

export function safelyDo<U>(context: BasicContext, f: (c: any) => Promise<U>) {

  const safeRunner = async (c: any) => {
    try {
      context.commit('loading', true)
      context.commit('error', null)
      await f(c)
    } catch (error) {
      context.commit('error', error)
      log.error('safelyDo', error)
    } finally {
      context.commit('loading', false)
    }
  }
  return havingCli(context, safeRunner)
}

export async function safely<U>(context: BasicContext, f: () => Promise<U>) {
  try {
    context.commit('loading', true)
    context.commit('error', null)
    await f()
  } catch (error) {
    context.commit('error', error)
    log.error('safely', error)
  } finally {
    context.commit('loading', false)
  }
}


export function upsert<T extends HasId>(list: T[], item: T, func = (a: T, b: T) => a.id === b.id) {
  const found = _.find(list, (q: T) => func(q, item))
  if (found) {
    // we do this so that the object itself stays the same
    Object.assign(found, item)
  } else {
    list.push(item)
  }
}
