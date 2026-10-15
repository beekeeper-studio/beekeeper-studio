import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Vuex from 'vuex'
import Vue from 'vue'
import { CredentialsModule } from '@/store/modules/CredentialsModule'
import { LocalWorkspace } from '@/common/interfaces/IWorkspace'
import { CloudClient } from '@/lib/cloud/CloudClient'

Vue.use(Vuex)

vi.mock('@/lib/cloud/CloudClient')

const mockSend = vi.fn()
Vue.prototype.$util = { send: mockSend }

function buildStore(options: { isLifetime: boolean, lastUsedWorkspace: number }) {
  return new Vuex.Store({
    state: { workspaceId: LocalWorkspace.id },
    mutations: {
      workspaceId(state: any, id: number) {
        state.workspaceId = Number(id)
      },
    },
    modules: {
      credentials: CredentialsModule,
      licenses: {
        namespaced: true,
        getters: {
          isLifetime: () => options.isLifetime,
        },
      },
      settings: {
        namespaced: true,
        getters: {
          lastUsedWorkspace: () => ({ value: String(options.lastUsedWorkspace) }),
        },
      },
    },
  })
}

function seedCloudWorkspace(store: ReturnType<typeof buildStore>) {
  store.commit('credentials/add', {
    id: 1,
    credential: { id: 1, appId: 'beekeeper-app-x', email: 'user@example.com', token: 'token' },
    client: null,
    workspaces: [{ id: 42, name: 'Team Workspace' }],
  })
}

describe('CredentialsModule', () => {
  const originalBksConfig = (window as any).bksConfig

  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockReset()
    mockSend.mockResolvedValue(null)
    ;(window as any).bksConfig = { cloud: { workspacesDisabled: false } }
  })

  afterEach(() => {
    (window as any).bksConfig = originalBksConfig
  })

  describe('with cloud workspaces turned off', () => {
    beforeEach(() => {
      (window as any).bksConfig.cloud.workspacesDisabled = true
    })

    it('does not load saved workspace accounts', async () => {
      const store = buildStore({ isLifetime: false, lastUsedWorkspace: LocalWorkspace.id })
      seedCloudWorkspace(store)

      await store.dispatch('credentials/load')

      expect(mockSend).not.toHaveBeenCalledWith('appdb/credential/find')
      expect(CloudClient).not.toHaveBeenCalled()
      expect((store.state as any).credentials.credentials).toEqual([])
      expect(store.getters['credentials/workspaces']).toEqual([
        { workspace: LocalWorkspace, client: null, credentialId: null },
      ])
    })

    it('does not restore the last used cloud workspace', async () => {
      const store = buildStore({ isLifetime: false, lastUsedWorkspace: 42 })
      seedCloudWorkspace(store)

      await store.dispatch('credentials/setUserWorkspace')

      expect(mockSend).not.toHaveBeenCalled()
      expect(store.state.workspaceId).toBe(LocalWorkspace.id)
    })

    it('still activates the local workspace', async () => {
      const store = buildStore({ isLifetime: false, lastUsedWorkspace: LocalWorkspace.id })

      await store.dispatch('credentials/load')

      expect(mockSend).toHaveBeenCalledWith('workspace/setActive', {
        wId: LocalWorkspace.id,
      })
    })

    it('refuses to sign in', async () => {
      const store = buildStore({ isLifetime: false, lastUsedWorkspace: LocalWorkspace.id })

      await expect(
        store.dispatch('credentials/login', { email: 'user@example.com', password: 'secret' })
      ).rejects.toThrow(/turned off by configuration/)

      expect(CloudClient.login).not.toHaveBeenCalled()
      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe('setUserWorkspace', () => {
    it('restores the last used cloud workspace on an active subscription', async () => {
      const store = buildStore({ isLifetime: false, lastUsedWorkspace: 42 })
      seedCloudWorkspace(store)

      await store.dispatch('credentials/setUserWorkspace')

      expect(mockSend).toHaveBeenCalledWith('workspace/setActive', {
        wId: 42,
        credentialId: 1,
      })
      expect(store.state.workspaceId).toBe(42)
    })

    it('does not restore a cloud workspace on a lifetime license', async () => {
      const store = buildStore({ isLifetime: true, lastUsedWorkspace: 42 })
      seedCloudWorkspace(store)

      await store.dispatch('credentials/setUserWorkspace')

      expect(mockSend).not.toHaveBeenCalled()
      expect(store.state.workspaceId).toBe(LocalWorkspace.id)
    })

    it('still restores the local workspace on a lifetime license', async () => {
      const store = buildStore({ isLifetime: true, lastUsedWorkspace: LocalWorkspace.id })
      seedCloudWorkspace(store)

      await store.dispatch('credentials/setUserWorkspace')

      expect(mockSend).toHaveBeenCalledWith('workspace/setActive', {
        wId: LocalWorkspace.id,
      })
    })
  })
})
