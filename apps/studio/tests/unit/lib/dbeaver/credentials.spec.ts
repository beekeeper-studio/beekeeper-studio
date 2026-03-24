import crypto from 'crypto'
import { decryptDBeaverCredentials, decryptValue } from '@/lib/dbeaver/credentials'
import fs from 'fs'
import path from 'path'
import os from 'os'

const DBEAVER_KEY = Buffer.from('babb4a9f774ab853c96c2d653dfe544a', 'hex')
const ZERO_IV = Buffer.alloc(16, 0)

function encryptForDBeaver(plaintext: string): string {
  const prefix = crypto.randomBytes(16)
  const data = Buffer.concat([prefix, Buffer.from(plaintext, 'utf8')])
  const cipher = crypto.createCipheriv('aes-128-cbc', DBEAVER_KEY, ZERO_IV)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  return encrypted.toString('base64')
}

describe('DBeaver credential decryption', () => {
  it('decrypts a single Base64-encoded value', () => {
    const encrypted = encryptForDBeaver('mypassword123')
    const result = decryptValue(encrypted)
    expect(result).toBe('mypassword123')
  })

  it('decrypts credentials-config.json from a directory', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbeaver-test-'))
    const credsContent = JSON.stringify({
      'postgres-jdbc-abc123': {
        '#connection': {
          user: encryptForDBeaver('admin'),
          password: encryptForDBeaver('secret')
        }
      }
    })
    fs.writeFileSync(path.join(tmpDir, 'credentials-config.json'), credsContent)

    const result = await decryptDBeaverCredentials(tmpDir)
    expect(result.get('postgres-jdbc-abc123')).toEqual({
      user: 'admin',
      password: 'secret'
    })

    fs.rmSync(tmpDir, { recursive: true })
  })

  it('returns empty map when credentials file does not exist', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbeaver-test-'))
    const result = await decryptDBeaverCredentials(tmpDir)
    expect(result.size).toBe(0)
    fs.rmSync(tmpDir, { recursive: true })
  })

  it('returns empty map when decryption fails', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbeaver-test-'))
    fs.writeFileSync(path.join(tmpDir, 'credentials-config.json'), '{"bad": "not valid json creds"}')
    const result = await decryptDBeaverCredentials(tmpDir)
    expect(result.size).toBe(0)
    fs.rmSync(tmpDir, { recursive: true })
  })
})
