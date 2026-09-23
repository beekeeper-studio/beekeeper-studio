/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { decryptDBeaverConfig, decryptDBeaverCredentials, DBEAVER_CREDENTIALS_KEY } from '@/backend/lib/objectimport/dbeaver/crypto'
import { DBEAVER_CONFIG_DIR } from '@tests/vitest/lib/dbeaverFixtures'

function encrypt(plain: string, key: Buffer): Buffer {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv)
  return Buffer.concat([iv, cipher.update(plain, 'utf8'), cipher.final()])
}

describe('DBeaver credentials decryption', () => {
  it('decrypts a credentials-config.json written by DBeaver', async () => {
    const data = await fs.readFile(path.join(DBEAVER_CONFIG_DIR, 'credentials-config.json'))
    const credentials = decryptDBeaverCredentials(data)

    expect(credentials['postgres-jdbc-1a0cc4aa8c1-4a433466ab963944']).toEqual({
      '#connection': { user: 'postgres', password: 'pg-secret' },
    })
    expect(credentials['postgres-jdbc-1a0cc4c7f51-4cb03b4244f34627']['network/ssh_tunnel']).toEqual({
      user: 'deploy',
      password: 'ssh-secret',
    })
    expect(credentials['profile:corp-bastion']).toEqual({
      'network/ssh_tunnel/profile/corp-bastion': { user: 'corp', password: 'corp-ssh-secret' },
    })
  })

  it('decrypts the credentials of a secondary storage file', async () => {
    const data = await fs.readFile(path.join(DBEAVER_CONFIG_DIR, 'credentials-config-team.json'))
    expect(decryptDBeaverCredentials(data)).toEqual({
      'postgres-jdbc-1a0cc4f0000-1111111111111111': { '#connection': { user: 'team', password: 'team-secret' } },
    })
  })

  it('round-trips with the static DBeaver key', () => {
    const json = JSON.stringify({ id: { '#connection': { user: 'u', password: 'p' } } })
    expect(decryptDBeaverConfig(encrypt(json, DBEAVER_CREDENTIALS_KEY))).toEqual(json)
  })

  it('rejects files encrypted with another key', () => {
    const otherKey = Buffer.from('00112233445566778899aabbccddeeff', 'hex')
    const data = encrypt(JSON.stringify({ id: { '#connection': { password: 'secret' } } }), otherKey)
    expect(() => decryptDBeaverCredentials(data)).toThrow()
  })

  it('rejects data that is not encrypted', () => {
    expect(() => decryptDBeaverConfig(Buffer.from('{"not": "encrypted"}'))).toThrow('not an encrypted DBeaver configuration file')
    expect(() => decryptDBeaverConfig(Buffer.alloc(0))).toThrow()
  })
})
