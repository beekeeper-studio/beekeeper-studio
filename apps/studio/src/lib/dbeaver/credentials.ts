import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const DBEAVER_KEY = Buffer.from('babb4a9f774ab853c96c2d653dfe544a', 'hex')
const ZERO_IV = Buffer.alloc(16, 0)

export function decryptValue(base64Encrypted: string): string | null {
  try {
    const encrypted = Buffer.from(base64Encrypted, 'base64')
    const decipher = crypto.createDecipheriv('aes-128-cbc', DBEAVER_KEY, ZERO_IV)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    // DBeaver prepends 16 random bytes as ad-hoc IV; skip them
    return decrypted.subarray(16).toString('utf8')
  } catch {
    return null
  }
}

export interface DBeaverCredential {
  user: string | null
  password: string | null
}

export async function decryptDBeaverCredentials(
  dbeaverDir: string
): Promise<Map<string, DBeaverCredential>> {
  const result = new Map<string, DBeaverCredential>()

  const credsPath = path.join(dbeaverDir, 'credentials-config.json')
  if (!fs.existsSync(credsPath)) {
    return result
  }

  try {
    const raw = fs.readFileSync(credsPath, 'utf8')
    const parsed = JSON.parse(raw)

    for (const [connId, connData] of Object.entries(parsed)) {
      try {
        const conn = connData as Record<string, any>
        const creds = conn['#connection']
        if (!creds) continue

        const user = creds.user ? decryptValue(creds.user) : null
        const password = creds.password ? decryptValue(creds.password) : null

        if (user !== null || password !== null) {
          result.set(connId, { user, password })
        }
      } catch {
        // Skip individual connection credentials that fail
      }
    }
  } catch {
    // File unreadable or invalid JSON — return empty map
  }

  return result
}
