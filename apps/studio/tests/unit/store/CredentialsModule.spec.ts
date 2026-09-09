import Vuex from 'vuex'
import Vue from 'vue'
import { CredentialsModule } from '@/store/modules/CredentialsModule'
import { LocalWorkspace } from '@/common/interfaces/IWorkspace'

Vue.use(Vuex)

jest.mock('@/lib/cloud/CloudClient')

const mockSend = jest.fn()
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
  beforeEach(() => {
    mockSend.mockReset()
    mockSend.mockResolvedValue(null)
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
