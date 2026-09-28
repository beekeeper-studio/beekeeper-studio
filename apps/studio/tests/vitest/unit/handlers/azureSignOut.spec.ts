import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// connHandlers pulls in every db client through the connection provider, and
// loading those under jsdom fails on AbortSignal.timeout. None of it is needed
// here.
vi.mock('@commercial/backend/lib/connection-provider', () => ({ default: {} }))

import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { AzureAuthService } from '@/lib/db/authentication/azure'
import { ConnHandlers } from '@commercial/backend/handlers/connHandlers'
import { newState, removeState, state } from '@/handlers/handlerState'

const SID = 'window-1'

// Signing out of Azure clears the authId of the saved connection. A connection
// that was never saved has no row: looking one up by its nil id used to find
// an unrelated saved connection and clear that one's sign-in instead.
describe('conn/azureSignOut', () => {
  let other: SavedConnection

  beforeEach(async () => {
    await TestOrmConnection.connect()
    vi.spyOn(AzureAuthService, 'ssoSignOut').mockResolvedValue(undefined)
    other = new SavedConnection()
    other.connectionType = 'sqlserver'
    other.name = 'Someone elses warehouse'
    other.host = 'warehouse.example.com'
    other.authId = 41
    await other.save()
    newState(SID)
  })

  afterEach(async () => {
    await removeState(SID)
    vi.restoreAllMocks()
    await TestOrmConnection.disconnect()
  })

  it('leaves saved connections alone when signing out of an unsaved one', async () => {
    const config = { id: null, connectionType: 'sqlserver', authId: 17 } as any
    state(SID).usedConfig = config

    await ConnHandlers['conn/azureSignOut']({ config, sId: SID })

    expect(AzureAuthService.ssoSignOut).toHaveBeenCalledWith(17)
    expect((await SavedConnection.findOneBy({ id: other.id })).authId).toBe(41)
    expect(state(SID).usedConfig.authId).toBeNull()
  })

  it('clears the sign-in of the saved connection it was given', async () => {
    const config = { id: other.id, connectionType: 'sqlserver', authId: 41 } as any

    await ConnHandlers['conn/azureSignOut']({ config, sId: SID })

    expect((await SavedConnection.findOneBy({ id: other.id })).authId).toBeNull()
  })
})
