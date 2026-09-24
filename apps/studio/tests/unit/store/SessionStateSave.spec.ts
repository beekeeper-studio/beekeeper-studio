import Vue from 'vue'
import Vuex from 'vuex'
import { PinModule } from '@/store/modules/PinModule'
import { HideEntityModule } from '@/store/modules/HideEntityModule'

Vue.use(Vuex)

const WORKSPACE_ID = -1
const CONNECTION_ID = 7

// Pins and hidden entities made during a session are only persisted lazily,
// when the connection they belong to is saved. They belong to the session if
// they carry its connection *and* its workspace - comparing a workspace id
// against a connection id matches nothing, so nothing is ever written.

function buildStore() {
  return new Vuex.Store({
    state: {
      usedConfig: { id: CONNECTION_ID, workspaceId: WORKSPACE_ID },
    } as any,
    modules: { pins: PinModule, hideEntities: HideEntityModule },
  })
}

describe('saving session state when the connection is saved', () => {
  let store: ReturnType<typeof buildStore>
  let send: jest.Mock

  beforeEach(() => {
    send = jest.fn(async (_channel: string, args: any) => args.obj)
    Vue.prototype.$util = { send }
    store = buildStore()
  })

  it('saves pins made during the session', async () => {
    store.commit('pins/set', [
      { id: null, connectionId: CONNECTION_ID, workspaceId: WORKSPACE_ID, entityName: 'users' },
    ])

    await store.dispatch('pins/maybeSavePins')

    expect(send).toHaveBeenCalledWith('appdb/pins/save', expect.anything())
  })

  it('saves hidden entities made during the session', async () => {
    store.commit('hideEntities/set', {
      entities: [{ id: null, connectionId: CONNECTION_ID, workspaceId: WORKSPACE_ID, entityType: 'table' }],
      schemas: [],
    })

    await store.dispatch('hideEntities/maybeSave')

    expect(send).toHaveBeenCalledWith('appdb/hiddenEntity/save', expect.anything())
  })

  it('leaves another connection\'s pins alone', async () => {
    store.commit('pins/set', [
      { id: null, connectionId: CONNECTION_ID + 1, workspaceId: WORKSPACE_ID, entityName: 'users' },
    ])

    await store.dispatch('pins/maybeSavePins')

    expect(send).not.toHaveBeenCalled()
  })
})
