// connHandlers pulls in every db client through the connection provider, and
// loading those under jsdom fails on AbortSignal.timeout. The provider is
// replaced with a fake server whose connect() the tests control.
const mockConnection = {
  connectionType: 'postgresql',
  connect: jest.fn(async () => undefined),
  server: { config: {} },
  database: { database: 'app' },
}
jest.mock('@commercial/backend/lib/connection-provider', () => ({
  __esModule: true,
  default: { for: () => ({ createConnection: () => mockConnection }) },
}))

import { ConnHandlers } from '@commercial/backend/handlers/connHandlers'
import { newState, removeState } from '@/handlers/handlerState'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { UsedConnection } from '@/common/appdb/models/used_connection'
import { AppDbHandlers } from '@/handlers/appDbHandlers'

const SID = 'conn-create-test'
const WORKSPACE_ID = -1

// A connection only counts as "used" once it has actually connected. The
// used_connection row is written by the backend as part of conn/create, after
// connect() succeeds - never by the renderer, and never for a failed attempt.

async function savedConfig(overrides: Partial<SavedConnection> = {}) {
  const c = new SavedConnection()
  c.connectionType = 'postgresql'
  c.name = 'My Saved Conn'
  c.host = 'saved.example.com'
  c.port = 5432
  Object.assign(c, overrides)
  await c.save()
  // plain object, as the renderer sends it
  const fetched = await AppDbHandlers['appdb/saved/findOneBy']({ options: { id: c.id } })
  return { saved: c, config: { ...fetched, workspaceId: WORKSPACE_ID } }
}

async function unsavedConfig(host: string) {
  const fresh = await AppDbHandlers['appdb/saved/new']({
    init: { connectionType: 'postgresql', host, port: 5432 }
  })
  return { ...fresh, id: null, workspaceId: WORKSPACE_ID }
}

function create(config: any) {
  return ConnHandlers['conn/create']({ config, osUser: 'tester', sId: SID })
}

describe('conn/create records the used connection', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
    mockConnection.connect.mockReset().mockResolvedValue(undefined)
    newState(SID)
  })

  afterEach(async () => {
    await removeState(SID)
    await TestOrmConnection.disconnect()
  })

  it('links a saved connection to one used row, updated on reconnect', async () => {
    const { saved, config } = await savedConfig()

    await create(config)
    let used = await UsedConnection.find()
    expect(used).toHaveLength(1)
    expect(used[0].connectionId).toBe(saved.id)
    expect(used[0].host).toBe('saved.example.com')

    // Edited and reconnected: same row, fresh details.
    await create({ ...config, host: 'moved.example.com' })
    used = await UsedConnection.find()
    expect(used).toHaveLength(1)
    expect(used[0].host).toBe('moved.example.com')
  })

  it('records an unsaved connection unlinked, one row per connect', async () => {
    await create(await unsavedConfig('quick.example.com'))
    await create(await unsavedConfig('quick.example.com'))

    const used = await UsedConnection.find()
    expect(used).toHaveLength(2)
    expect(used.map((u) => u.connectionId)).toEqual([null, null])
  })

  it('records nothing when the connection fails', async () => {
    mockConnection.connect.mockRejectedValue(new Error('connection refused'))

    await expect(create(await unsavedConfig('down.example.com'))).rejects.toThrow('connection refused')

    expect(await UsedConnection.count()).toBe(0)
  })
})
