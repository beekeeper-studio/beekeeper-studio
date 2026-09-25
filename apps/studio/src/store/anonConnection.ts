import _ from 'lodash'
import Vue from 'vue'
import { IConnection } from '@/common/interfaces/IConnection'
import { LocalWorkspace } from '@/common/interfaces/IWorkspace'

// Everything the core interface keeps per connection (tabs, pins, hidden
// entities, query history) is keyed on a saved connection id. A connection that
// was never saved gets an anonymous saved connection (SavedConnection.anon) for
// the length of its session, so none of that has to special-case it.

/** The config a session on `config` runs with. */
export async function sessionConfigFor(config: IConnection): Promise<IConnection> {
  if (config.id) return config

  const id: number = await Vue.prototype.$util.send('appdb/saved/createAnon', { config })
  // A copy, so the connection form's config stays unsaved. The anonymous row is
  // local, so the session is keyed on the local workspace even in a cloud one.
  return { ...config, id, anon: true, workspaceId: LocalWorkspace.id }
}

/** What saving the session's connection from the core interface writes. */
export function connectionToSave(config: IConnection, isCloud: boolean): IConnection {
  if (!config.anon) return config
  // The anonymous row is local, so its id means nothing to a cloud workspace -
  // upserting with it would update whichever cloud connection shares it.
  if (isCloud) return { ..._.omit(config, 'anon'), id: null }
  // Locally the anonymous row becomes the saved connection, so the session's
  // tabs, pins and history carry over.
  return { ...config, anon: false }
}

/** The connection id the session's query history is kept under, if any. */
export function historyConnectionIdFor(config: Nullable<IConnection>, isCloud: boolean): Nullable<number> {
  // a cloud workspace keeps history on the server, which can't refer to a
  // local anonymous connection
  if (!config || (config.anon && isCloud)) return null
  return config.id
}
