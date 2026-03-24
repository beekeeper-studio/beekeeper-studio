import crypto from 'crypto'
import Encryptor from 'simple-encryptor'
import fs from 'fs'
import path from 'path'
import os from 'os'

let mockTmpDir: string

// Mock safeStorage
const mockSafeStorage = {
  isEncryptionAvailable: jest.fn().mockReturnValue(true),
  encryptString: jest.fn((str: string) => {
    return Buffer.from('SAFE:' + str)
  }),
  decryptString: jest.fn((buf: Buffer) => {
    const str = buf.toString()
    if (!str.startsWith('SAFE:')) {
      throw new Error('Unable to decrypt')
    }
    return str.slice(5)
  }),
}

let mockSafeStorageAvailable = true

jest.mock('electron', () => ({
  get safeStorage() {
    if (!mockSafeStorageAvailable) {
      return { isEncryptionAvailable: () => false }
    }
    return mockSafeStorage
  },
}))

jest.mock('@bksLogger', () => ({
  scope: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

jest.mock('@/common/platform_info', () => ({
  default: {
    get userDirectory() {
      return mockTmpDir
    },
  },
}))

function loadModule() {
  return require('@/common/encryption_key') as {
    loadEncryptionKey: () => string
    isEncryptionKeyInsecure: () => boolean
  }
}

const defaultEncryptionKey = "38782F413F442A472D4B6150645367566B59703373367639792442264529482B"

beforeEach(() => {
  mockTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-enc-test-'))
  jest.resetModules()
  delete process.env.BKS_ENCRYPTION_KEY
  delete process.env.BKS_ENCRYPTION_INSECURE
  mockSafeStorageAvailable = true
  mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
  mockSafeStorage.encryptString.mockImplementation((str: string) => Buffer.from('SAFE:' + str))
  mockSafeStorage.decryptString.mockImplementation((buf: Buffer) => {
    const str = buf.toString()
    if (!str.startsWith('SAFE:')) {
      throw new Error('Unable to decrypt')
    }
    return str.slice(5)
  })
})

afterEach(() => {
  fs.rmSync(mockTmpDir, { recursive: true, force: true })
})

describe('encryption_key', () => {
  describe('utility process (env var)', () => {
    it('returns key from BKS_ENCRYPTION_KEY env var', () => {
      process.env.BKS_ENCRYPTION_KEY = 'abc123'
      const mod = loadModule()
      expect(mod.loadEncryptionKey()).toBe('abc123')
    })

    it('reports insecure when BKS_ENCRYPTION_INSECURE=true', () => {
      process.env.BKS_ENCRYPTION_KEY = 'abc123'
      process.env.BKS_ENCRYPTION_INSECURE = 'true'
      const mod = loadModule()
      mod.loadEncryptionKey()
      expect(mod.isEncryptionKeyInsecure()).toBe(true)
    })

    it('reports secure when BKS_ENCRYPTION_INSECURE is not set', () => {
      process.env.BKS_ENCRYPTION_KEY = 'abc123'
      const mod = loadModule()
      mod.loadEncryptionKey()
      expect(mod.isEncryptionKeyInsecure()).toBe(false)
    })
  })

  describe('safeStorage available', () => {
    it('fresh install: generates 64-char hex key and creates .encryption-key file', () => {
      const mod = loadModule()
      const key = mod.loadEncryptionKey()
      expect(key).toMatch(/^[0-9a-f]{64}$/)
      expect(fs.existsSync(path.join(mockTmpDir, '.encryption-key'))).toBe(true)
      expect(fs.existsSync(path.join(mockTmpDir, '.key'))).toBe(false)
    })

    it('existing .encryption-key: reads and decrypts correctly', () => {
      const expectedKey = crypto.randomBytes(32).toString('hex')
      const encrypted = Buffer.from('SAFE:' + expectedKey)
      fs.writeFileSync(path.join(mockTmpDir, '.encryption-key'), encrypted)

      const mod = loadModule()
      const key = mod.loadEncryptionKey()
      expect(key).toBe(expectedKey)
    })

    it('migration from .key: reads old file, creates .encryption-key, deletes .key', () => {
      const legacyKey = crypto.randomBytes(32).toString('hex')
      const encryptor = Encryptor(defaultEncryptionKey)
      const encryptedLegacy = encryptor.encrypt({ encryptionKey: legacyKey })
      fs.writeFileSync(path.join(mockTmpDir, '.key'), encryptedLegacy, 'UTF8')

      const mod = loadModule()
      const key = mod.loadEncryptionKey()
      expect(key).toBe(legacyKey)
      expect(fs.existsSync(path.join(mockTmpDir, '.encryption-key'))).toBe(true)
      expect(fs.existsSync(path.join(mockTmpDir, '.key'))).toBe(false)
    })

    it('reports secure (isEncryptionKeyInsecure = false)', () => {
      const mod = loadModule()
      mod.loadEncryptionKey()
      expect(mod.isEncryptionKeyInsecure()).toBe(false)
    })
  })

  describe('safeStorage unavailable', () => {
    beforeEach(() => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false)
    })

    it('fresh install: creates .key file (fallback)', () => {
      const mod = loadModule()
      const key = mod.loadEncryptionKey()
      expect(key).toMatch(/^[0-9a-f]{64}$/)
      expect(fs.existsSync(path.join(mockTmpDir, '.key'))).toBe(true)
      expect(fs.existsSync(path.join(mockTmpDir, '.encryption-key'))).toBe(false)
    })

    it('existing .key: reads correctly', () => {
      const legacyKey = crypto.randomBytes(32).toString('hex')
      const encryptor = Encryptor(defaultEncryptionKey)
      const encryptedLegacy = encryptor.encrypt({ encryptionKey: legacyKey })
      fs.writeFileSync(path.join(mockTmpDir, '.key'), encryptedLegacy, 'UTF8')

      const mod = loadModule()
      const key = mod.loadEncryptionKey()
      expect(key).toBe(legacyKey)
    })

    it('reports insecure (isEncryptionKeyInsecure = true)', () => {
      const mod = loadModule()
      mod.loadEncryptionKey()
      expect(mod.isEncryptionKeyInsecure()).toBe(true)
    })
  })

  describe('error handling', () => {
    it('corrupted .encryption-key throws error', () => {
      fs.writeFileSync(path.join(mockTmpDir, '.encryption-key'), Buffer.from('corrupted-data'))

      const mod = loadModule()
      expect(() => mod.loadEncryptionKey()).toThrow(/Could not decrypt saved credentials/)
    })
  })
})
