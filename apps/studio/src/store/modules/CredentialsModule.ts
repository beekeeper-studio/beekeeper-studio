import { CloudCredential } from "@/common/appdb/models/CloudCredential";
import { IWorkspace, LocalWorkspace } from "@/common/interfaces/IWorkspace";
import platformInfo from "@/common/platform_info";
import { CloudClient, CloudClientOptions } from "@/lib/cloud/CloudClient";
import { uuidv4 } from "@/lib/uuid";
import { Module } from "vuex";
import { State as RootState } from '../index'
import { upsert } from "./data/StoreHelpers";

function genAppId() {
  return `beekeeper-app-${uuidv4()}`
}

export interface WSWithClient {
  workspace: IWorkspace,
  client: CloudClient
}

export interface CredentialBlob {
  id: number
  credential: CloudCredential
  error?: Error
  client: CloudClient
  workspaces: IWorkspace[]
}

interface State {
  credentials: CredentialBlob[]
  loading: boolean
}

async function credentialToBlob(c: CloudCredential): Promise<CredentialBlob> {
  const clientOptions: CloudClientOptions = {
    app: c.appId, email: c.email, token: c.token, baseUrl: platformInfo.cloudUrl
  }
  const client = new CloudClient(clientOptions)
  try {
    const workspaces = await client.workspaces.list()

    return {
      id: c.id,
      credential: c,
      client,
      workspaces,
      error: undefined
    }
  } catch (error) {
    return {
      id: c.id,
      credential: c,
      client,
      workspaces: [],
      error
    }
  }
}


export const CredentialsModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    credentials: [],
    loading: false,
  },
  getters: {
    clients(state): CloudClient[] {
      return state.credentials.map((cred) => cred.client)
    },
    workspaces(state): WSWithClient[] {
      const c: CredentialBlob[] = state.credentials
      const result = c.flatMap((cred) => {
        return cred.workspaces.map((ws) => ({
          workspace: ws, client: cred.client
        }))
      })
      return [
        { workspace: LocalWorkspace, client: null },
        ...result
      ]
    }
  },
  mutations: {
    loading(state, loading: boolean)  {
      state.loading = loading
    },
    replace(state, creds: CredentialBlob[]) {
      state.credentials = creds
    },
    add(state, cred: CredentialBlob) {
      upsert(state.credentials, cred)
    },
  },

  actions: {
    async load(context) {
      context.commit('loading', true)
      try {
        const creds = await CloudCredential.find()
        const results: CredentialBlob[] = []
        for (let index = 0; index < creds.length; index++) {
          const c = creds[index];
          const r = await credentialToBlob(c)
          results.push(r)
        }
        context.commit('replace', results)
      } finally {
        context.commit('loading', false)
      }
    },
    async login(context, { email, password }) {
      const existing = await CloudCredential.findOne({ email })
      const appId = (await CloudCredential.findOne())?.appId || genAppId()
      const cred = existing || new CloudCredential()
      cred.appId = appId
      cred.email = email

      const token = await CloudClient.login(platformInfo.cloudUrl, email, password, appId )
      cred.token = token
      await cred.save()
      const result = await credentialToBlob(cred)
      context.commit('add', result)
    },
    async logout(context, blob: CredentialBlob) {
      await blob.credential.remove()
      await context.dispatch('load')
      await context.commit('workspaceId', -1, { root: true})
    }
  }
} 