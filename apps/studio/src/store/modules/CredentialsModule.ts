import { CloudCredential } from "@/common/appdb/models/CloudCredential";
import { IWorkspace } from "@/common/interfaces/IWorkspace";
import platformInfo from "@/common/platform_info";
import { CloudClient, CloudClientOptions } from "@/lib/cloud/CloudClient";
import { uuidv4 } from "@/lib/uuid";
import { Module } from "vuex";
import { State as RootState } from '../index'
import { upsert } from "./data/StoreHelpers";

function genAppId() {
  return `beekeeper-app-${uuidv4()}`
}

interface State {
  credentials: CloudCredential[]
  workspaces: IWorkspace[]
  loading: boolean
  error: Error | null
}


export const CredentialsModule: Module<State, RootState> = {
  namespaced: true,
  state: {
    credentials: [],
    workspaces: [],
    loading: false,
    error: null
  },
  getters: {
    clients(state): CloudClient[] {
      return state.credentials.map((cred) => {
        const o: CloudClientOptions = {
          token: cred.token,
          app: cred.appId,
          email: cred.email,
          baseUrl: platformInfo.cloudUrl
        }
        return new CloudClient(o)
      })
    },
  },
  mutations: {
    replace(state, creds: CloudCredential[]) {
      state.credentials = creds
    },
    add(state, cred: CloudCredential) {
      upsert(state.credentials, cred)
    },
    workspaces(state, workspaces: IWorkspace[]) {
      state.workspaces = workspaces
    },
    loading(state, v: boolean) {
      state.loading = v
      if (v) state.error = null
    },
    error(state, error: Error | null) {
      state.error = error
    }
  },

  actions: {
    async loadWorkspaces(context) {
      try {
        context.commit('loading', true)
        const results = []
        for (let i = 0; i < context.getters.clients.length; i++) {
          const client: CloudClient = context.getters.clients[i];
          const workspaces = await client.workspaces.list()
          workspaces.forEach((ws) => {
            results.push({workspace: ws, client})
          })
        }
        context.commit('workspaces', results)
      } catch (ex) {
        context.commit('error', ex)
      } finally {
        context.commit('loading', false)
      }
    },
    async load(context) {
      const creds = await CloudCredential.find()
      context.commit('replace', creds)
      context.dispatch('loadWorkspaces')
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
      context.commit('add', cred)
      await context.dispatch('loadWorkspaces')
    }
  }
} 