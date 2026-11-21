import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { TokenCache } from '@/common/appdb/models/token_cache'
import { AzureAuthService } from '@/lib/db/authentication/azure'
import { AzureAuthType } from '@/lib/db/types'

// The token cache row can be deleted while a connection is open (signing out of a duplicate).
// Connect and Test recreate it, but changing database re-authenticates without that step.
describe('AzureAuthService with a deleted token cache', () => {
  let staleId: number

  beforeEach(async () => {
    await TestOrmConnection.connect()
    const cache = await new TokenCache().save()
    staleId = cache.id
    await cache.remove()
  })

  afterEach(async () => {
    await TestOrmConnection.disconnect()
  })

  it('still authenticates types that never read the cache', async () => {
    const service = new AzureAuthService()
    await service.init(staleId)
    const auth = await service.auth(AzureAuthType.ServicePrincipalSecret, { tenantId: 't', clientId: 'c', clientSecret: 's' })
    expect(auth.type).toBe('azure-active-directory-service-principal-secret')
  })

  it('reports an expired sign-in for SSO', async () => {
    const service = new AzureAuthService()
    await service.init(staleId)
    await expect(service.auth(AzureAuthType.AccessToken, {})).rejects.toThrow(/sign-in is no longer valid/i)
  })
})
