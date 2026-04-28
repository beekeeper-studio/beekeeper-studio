import crypto from 'crypto'
import Encryptor from 'simple-encryptor'
import fs from 'fs'
import path from 'path'
import { safeStorage } from 'electron'
import platformInfo from '@/common/platform_info'
import rawLog from '@bksLogger'

const log = rawLog.scope('encryption-key')

const defaultEncryptionKey = "38782F413F442A472D4B6150645367566B59703373367639792442264529482B"

let _encryptionKey: Nullable<string> = null
let _insecure = false

function initUserDirectory(d: string) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true })
  }
}

/**
 * Loads (or generates) the master encryption key used to encrypt saved credentials.
 * Uses the OS keychain via Electron's safeStorage when available, otherwise
 * falls back to the legacy file-based approach with a hardcoded bootstrap key.
 * The result is cached — subsequent calls return the same key.
 */
export function loadEncryptionKey(): string {
  if (_encryptionKey) {
    return _encryptionKey
  }

  const userDirectory = platformInfo.userDirectory
  initUserDirectory(userDirectory)

  const keychainFile = path.join(userDirectory, '.encryption-key')
  const legacyKeyFile = path.join(userDirectory, '.key')

  if (safeStorage.isEncryptionAvailable()) {
    _encryptionKey = loadWithSafeStorage(keychainFile, legacyKeyFile)
    _insecure = false
  } else {
    log.warn('safeStorage is not available — falling back to file-based encryption key. Credentials are less secure.')
    _encryptionKey = loadWithLegacyFile(legacyKeyFile)
    _insecure = true
  }

  return _encryptionKey
}

export function isEncryptionKeyInsecure(): boolean {
  if (_encryptionKey === null) {
    log.warn('isEncryptionKeyInsecure() called before loadEncryptionKey() — returning false')
    return false
  }
  return _insecure
}

function loadWithSafeStorage(keychainFile: string, legacyKeyFile: string): string {
  if (fs.existsSync(keychainFile)) {
    return readFromKeychainFile(keychainFile)
  }

  if (fs.existsSync(legacyKeyFile)) {
    return migrateFromLegacyFile(keychainFile, legacyKeyFile)
  }

  return generateFreshKey(keychainFile)
}

/** Reads and decrypts an existing .encryption-key file using the OS keychain. */
function readFromKeychainFile(keychainFile: string): string {
  log.info('Loading encryption key from keychain-protected file')
  const encryptedBuffer = fs.readFileSync(keychainFile)
  try {
    return safeStorage.decryptString(encryptedBuffer)
  } catch (err) {
    log.error('Failed to decrypt .encryption-key file. The OS keychain may have been reset or data moved from another machine.')
    throw new Error(
      'Could not decrypt saved credentials. The OS keychain may have been reset or data was moved from another machine. ' +
      `To start fresh, delete the file: ${keychainFile}. ` +
      'Please report this at https://github.com/beekeeper-studio/beekeeper-studio/issues'
    )
  }
}

/** Migrates the encryption key from the legacy .key file to a keychain-protected .encryption-key file. */
function migrateFromLegacyFile(keychainFile: string, legacyKeyFile: string): string {
  log.info('Migrating encryption key from legacy .key file to keychain-protected storage')
  const encryptor = Encryptor(defaultEncryptionKey)
  const encryptedData = fs.readFileSync(legacyKeyFile, 'UTF8')
  const data = encryptor.decrypt(encryptedData)
  if (!data || typeof data['encryptionKey'] !== 'string') {
    throw new Error(
      `Could not read the legacy encryption key file. The file at ${legacyKeyFile} may be corrupted.`
    )
  }
  const key = data['encryptionKey'] as string

  // Write new keychain-protected file
  const encryptedBuffer = safeStorage.encryptString(key)
  fs.writeFileSync(keychainFile, encryptedBuffer)
  if (process.platform !== 'win32') {
    fs.chmodSync(keychainFile, 0o600)
  }

  // Verify the new file works before deleting the old one
  const verifyBuffer = fs.readFileSync(keychainFile)
  const verifiedKey = safeStorage.decryptString(verifyBuffer)
  if (verifiedKey !== key) {
    throw new Error('Migration verification failed: decrypted key does not match original')
  }

  // Delete legacy file — non-fatal if this fails
  try {
    fs.unlinkSync(legacyKeyFile)
    log.info('Migration complete — legacy .key file removed')
  } catch (err) {
    log.warn(`Migration complete but could not delete legacy .key file: ${err.message}`)
  }

  return key
}

/** Generates a new random encryption key and stores it in a keychain-protected file. */
function generateFreshKey(keychainFile: string): string {
  log.info('Generating new encryption key (fresh install)')
  const key = crypto.randomBytes(32).toString('hex')
  const encryptedBuffer = safeStorage.encryptString(key)
  fs.writeFileSync(keychainFile, encryptedBuffer)
  if (process.platform !== 'win32') {
    fs.chmodSync(keychainFile, 0o600)
  }

  return key
}

function loadWithLegacyFile(legacyKeyFile: string): string {
  const encryptor = Encryptor(defaultEncryptionKey)

  if (!fs.existsSync(legacyKeyFile)) {
    const generatedKey = crypto.randomBytes(32)
    const newKey = generatedKey.toString('hex')
    const result = { encryptionKey: newKey }
    fs.writeFileSync(legacyKeyFile, encryptor.encrypt(result), 'UTF8')
    if (process.platform !== 'win32') {
      fs.chmodSync(legacyKeyFile, 0o600)
    }
  }

  const encryptedData = fs.readFileSync(legacyKeyFile, 'UTF8')
  const data = encryptor.decrypt(encryptedData)
  if (!data || typeof data['encryptionKey'] !== 'string') {
    throw new Error(
      `Could not read the encryption key file. The file at ${legacyKeyFile} may be corrupted.`
    )
  }
  return data['encryptionKey'] as string
}
