import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// connHandlers pulls in every db client through the connection provider, and
// loading those under jsdom fails on AbortSignal.timeout. The provider is
// replaced with a fake server that always connects.
const mockConnection = {
  connectionType: 'sqlserver',
  connect: vi.fn(async () => undefined),
  connector: { on: vi.fn() },
  server: { config: {} },
  database: { database: 'app' },
}
vi.mock('@commercial/backend/lib/connection-provider', () => ({
  __esModule: true,
  default: {
    for: () => ({
      createConnection: () => mockConnection,
      getServerConfig: () => ({}),
      disconnect: vi.fn(),
    }),
  },
}))

const { ssoSignOut } = vi.hoisted(() => ({ ssoSignOut: vi.fn(async () => undefined) }))
vi.mock('@/lib/db/authentication/azure', () => ({
  AzureAuthService: { ssoSignOut },
}))

import { ConnHandlers } from '@commercial/backend/handlers/connHandlers'
import { newState, removeState } from '@/handlers/handlerState'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { UsedConnection } from '@/common/appdb/models/used_connection'
import { TokenCache } from '@/common/appdb/models/token_cache'
import { AppDbHandlers } from '@/handlers/appDbHandlers'

const SID = 'azure-token-cache-test'
const LOCAL_WORKSPACE_ID = -1
const CLOUD_WORKSPACE_ID = 7

// A token cache lives in this machine's app db. Local connections point at it
// from their saved_connection row. Workspace connections are stored in the
// cloud and shared between members, so their pointer lives on this machine's
// used_connection row instead and never on the cloud copy.

async function localSavedConfig(overrides: Partial<SavedConnection> = {}) {
  const c = new SavedConnection()
  c.connectionType = 'sqlserver'
  c.name = 'Local Azure'
  c.host = 'local.database.windows.net'
  c.port = 1433
  c.azureAuthOptions = { azureAuthEnabled: true }
  Object.assign(c, overrides)
  await c.save()
  // plain object, as the renderer sends it
  const fetched = await AppDbHandlers['appdb/saved/findOneBy']({ options: { id: c.id } })
  return { saved: c, config: { ...fetched, workspaceId: LOCAL_WORKSPACE_ID } }
}

// A workspace connection has never been in saved_connection on this machine;
// its id is the cloud id.
async function workspaceConfig(id: number, overrides: any = {}) {
  const fresh = await AppDbHandlers['appdb/saved/new']({
    init: { connectionType: 'sqlserver', host: 'cloud.database.windows.net', port: 1433 }
  })
  return {
    ...fresh,
    id,
    workspaceId: CLOUD_WORKSPACE_ID,
    azureAuthOptions: { azureAuthEnabled: true },
    ...overrides,
  }
}

function create(config: any) {
  return ConnHandlers['conn/create']({ config, osUser: 'tester', sId: SID })
}

function signOut(config: any) {
  return ConnHandlers['conn/azureSignOut']({ config, sId: SID })
}

async function usedRowFor(config: any) {
  return await UsedConnection.findOneBy({ connectionId: config.id, workspaceId: config.workspaceId })
}

describe('azure token cache', () => {
  beforeEach(async () => {
    await TestOrmConnection.connect()
    mockConnection.connect.mockReset().mockResolvedValue(undefined)
    ssoSignOut.mockClear()
    newState(SID)
  })

  afterEach(async () => {
    await removeState(SID)
    await TestOrmConnection.disconnect()
  })

  describe('conn/create, local connections', () => {
    it('creates a cache and links it to the saved connection', async () => {
      const { saved, config } = await localSavedConfig()

      await create(config)

      const reloaded = await SavedConnection.findOneBy({ id: saved.id })
      expect(reloaded.authId).not.toBeNull()
      expect(await TokenCache.findOneBy({ id: reloaded.authId })).toBeTruthy()
    })

    it('reuses the cache the connection already has', async () => {
      const cache = await new TokenCache().save()
      const { saved, config } = await localSavedConfig({ authId: cache.id })

      await create(config)

      expect(await TokenCache.count()).toBe(1)
      expect((await SavedConnection.findOneBy({ id: saved.id })).authId).toBe(cache.id)
    })

    it('does not throw when the saved connection no longer exists', async () => {
      const { saved, config } = await localSavedConfig()
      await saved.remove()

      await expect(create(config)).resolves.toBeUndefined()
      expect(await TokenCache.count()).toBe(1)
    })

    it('does nothing when azure auth is off', async () => {
      const { saved, config } = await localSavedConfig({ azureAuthOptions: { azureAuthEnabled: false } })

      await create(config)

      expect(await TokenCache.count()).toBe(0)
      expect((await SavedConnection.findOneBy({ id: saved.id })).authId).toBeNull()
    })
  })

  // Duplicating a connection copies its authId, and recent connections keep theirs, so
  // signing out of one deletes a cache another still points at.
  describe('conn/create, local connections with a deleted cache', () => {
    it('creates a new cache and relinks the saved connection', async () => {
      const cache = await new TokenCache().save()
      const stale = cache.id
      const { saved, config } = await localSavedConfig({ authId: stale })
      await cache.remove()

      await create(config)

      const reloaded = await SavedConnection.findOneBy({ id: saved.id })
      expect(reloaded.authId).not.toBeNull()
      expect(reloaded.authId).not.toBe(stale)
      expect(await TokenCache.findOneBy({ id: reloaded.authId })).toBeTruthy()
      expect(config.authId).toBe(reloaded.authId)
    })

    it('creates a new cache for an unsaved (recent) connection', async () => {
      const cache = await new TokenCache().save()
      const stale = cache.id
      await cache.remove()
      const fresh = await AppDbHandlers['appdb/saved/new']({
        init: { connectionType: 'sqlserver', host: 'local.database.windows.net', port: 1433 }
      })
      const config: any = {
        ...fresh, id: null, workspaceId: LOCAL_WORKSPACE_ID,
        azureAuthOptions: { azureAuthEnabled: true }, authId: stale,
      }

      await create(config)

      expect(config.authId).not.toBe(stale)
      expect(await TokenCache.findOneBy({ id: config.authId })).toBeTruthy()
    })

    it('does the same when testing the connection', async () => {
      const cache = await new TokenCache().save()
      const stale = cache.id
      const { config } = await localSavedConfig({ authId: stale })
      await cache.remove()

      await ConnHandlers['conn/test']({ config, osUser: 'tester', sId: SID })

      expect(config.authId).not.toBe(stale)
      expect(await TokenCache.findOneBy({ id: config.authId })).toBeTruthy()
    })
  })

  describe('conn/create, workspace connections', () => {
    it('does not touch a local saved connection that shares the id', async () => {
      const { saved: local } = await localSavedConfig()
      const config = await workspaceConfig(local.id)

      await create(config)

      expect((await SavedConnection.findOneBy({ id: local.id })).authId).toBeNull()
    })

    it('keeps the cache id on the used connection row', async () => {
      const config = await workspaceConfig(9000)

      await create(config)

      const used = await usedRowFor(config)
      expect(used.authId).not.toBeNull()
      expect(await TokenCache.findOneBy({ id: used.authId })).toBeTruthy()
    })

    it('reuses the same cache on reconnect', async () => {
      const config = await workspaceConfig(9000)

      await create(config)
      const first = (await usedRowFor(config)).authId
      // the renderer's copy never gets an authId for a workspace connection
      await create({ ...config, authId: null })

      expect(await TokenCache.count()).toBe(1)
      expect((await usedRowFor(config)).authId).toBe(first)
    })

    it('ignores an authId on the cloud copy', async () => {
      // someone else's cache id, which here points at an unrelated cache
      const unrelated = await new TokenCache().save()
      const config = await workspaceConfig(9000, { authId: unrelated.id })

      await create(config)

      const used = await usedRowFor(config)
      expect(used.authId).not.toBe(unrelated.id)
      expect(await TokenCache.count()).toBe(2)
    })

    it('creates a new cache when the linked one is gone', async () => {
      const config = await workspaceConfig(9000)
      await create(config)
      const stale = (await usedRowFor(config)).authId
      await (await TokenCache.findOneBy({ id: stale })).remove()

      await create(config)

      const used = await usedRowFor(config)
      expect(used.authId).not.toBe(stale)
      expect(await TokenCache.findOneBy({ id: used.authId })).toBeTruthy()
    })
  })

  describe('conn/test', () => {
    it('does not touch a local saved connection that shares the id', async () => {
      const { saved: local } = await localSavedConfig()
      const config = await workspaceConfig(local.id)

      await ConnHandlers['conn/test']({ config, osUser: 'tester', sId: SID })

      expect((await SavedConnection.findOneBy({ id: local.id })).authId).toBeNull()
    })
  })

  describe('conn/azureSignOut', () => {
    it('signs out a local connection and clears its saved row', async () => {
      const cache = await new TokenCache().save()
      const { saved, config } = await localSavedConfig({ authId: cache.id })

      await signOut(config)

      expect(ssoSignOut).toHaveBeenCalledWith(cache.id)
      expect((await SavedConnection.findOneBy({ id: saved.id })).authId).toBeNull()
    })

    it('signs out an unsaved local connection', async () => {
      const cache = await new TokenCache().save()
      const fresh = await AppDbHandlers['appdb/saved/new']({ init: { connectionType: 'sqlserver' } })

      await signOut({ ...fresh, id: null, workspaceId: LOCAL_WORKSPACE_ID, authId: cache.id })

      expect(ssoSignOut).toHaveBeenCalledWith(cache.id)
    })

    it('signs out a workspace connection with the cache from its used row', async () => {
      const config = await workspaceConfig(9000)
      await create(config)
      const authId = (await usedRowFor(config)).authId

      await signOut({ ...config, authId: null })

      expect(ssoSignOut).toHaveBeenCalledWith(authId)
      expect((await usedRowFor(config)).authId).toBeNull()
    })

    it('does not touch a local saved connection that shares the id', async () => {
      const cache = await new TokenCache().save()
      const { saved: local } = await localSavedConfig({ authId: cache.id })
      const config = await workspaceConfig(local.id)

      await signOut(config)

      expect(ssoSignOut).not.toHaveBeenCalled()
      expect((await SavedConnection.findOneBy({ id: local.id })).authId).toBe(cache.id)
    })

    it('does nothing for a workspace connection that was never signed in', async () => {
      await expect(signOut(await workspaceConfig(9000))).resolves.toBeUndefined()
      expect(ssoSignOut).not.toHaveBeenCalled()
    })
  })
})
