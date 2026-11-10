import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { SavedConnection } from '@/common/appdb/models/saved_connection'

// trustServerCertificate defaults to true so a stock SQL Server -- which always presents a
// self-signed certificate -- connects from an untouched form. That is a class-field default,
// so it must reach new connections only: silently re-enabling certificate trust on a
// connection a user deliberately saved with it off would be a security regression.

describe('SavedConnection trustServerCertificate', () => {
  beforeAll(async () => {
    await TestOrmConnection.connect()
  })

  afterAll(async () => {
    await TestOrmConnection.disconnect()
  })

  it('defaults to trusting the certificate on a new connection', () => {
    expect(new SavedConnection().trustServerCertificate).toBe(true)
  })

  it('keeps the stored value when an existing connection is loaded back', async () => {
    const saved = new SavedConnection()
    saved.connectionType = 'sqlserver'
    saved.name = 'validates the certificate'
    saved.host = 'db.example.com'
    saved.trustServerCertificate = false
    await saved.save()

    const reloaded = await SavedConnection.findOneBy({ id: saved.id })
    expect(reloaded.trustServerCertificate).toBe(false)
  })

  it('persists the default for a connection the user never touched', async () => {
    const saved = new SavedConnection()
    saved.connectionType = 'sqlserver'
    saved.name = 'stock install'
    saved.host = 'db.example.com'
    await saved.save()

    const reloaded = await SavedConnection.findOneBy({ id: saved.id })
    expect(reloaded.trustServerCertificate).toBe(true)
  })
})
