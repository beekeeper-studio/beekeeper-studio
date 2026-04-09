import crypto from 'crypto'
import Encryptor from 'simple-encryptor'
import fs from 'fs'
import path from 'path'

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

// The real platform_info returns './tmp' in test mode (TEST_MODE=1),
// so we use that directory for all test files.
const userDirectory = './tmp'

function loadMainModule() {
  return require('@/backend/lib/encryption_key') as {
    loadEncryptionKey: () => string
    isEncryptionKeyInsecure: () => boolean
  }
}

function loadCommonModule() {
  return require('@/common/encryption_key') as {
    setEncryptionKey: (key: string, insecure: boolean) => void
    loadEncryptionKey: () => string
    isEncryptionKeyInsecure: () => boolean
  }
}

const defaultEncryptionKey = "38782F413F442A472D4B6150645367566B59703373367639792442264529482B"

function cleanupTestFiles() {
  const keychainFile = path.join(userDirectory, '.encryption-key')
  const legacyFile = path.join(userDirectory, '.key')
  if (fs.existsSync(keychainFile)) fs.unlinkSync(keychainFile)
  if (fs.existsSync(legacyFile)) fs.unlinkSync(legacyFile)
}

beforeEach(() => {
  if (!fs.existsSync(userDirectory)) {
    fs.mkdirSync(userDirectory, { recursive: true })
  }
  cleanupTestFiles()
  jest.resetModules()
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
  cleanupTestFiles()
})

describe('common/encryption_key (utility process cache)', () => {
  it('throws if loadEncryptionKey is called before setEncryptionKey', () => {
    const mod = loadCommonModule()
    expect(() => mod.loadEncryptionKey()).toThrow(/not been received/)
  })

  it('returns the key after setEncryptionKey is called', () => {
    const mod = loadCommonModule()
    mod.setEncryptionKey('test-key-123', false)
    expect(mod.loadEncryptionKey()).toBe('test-key-123')
  })

  it('returns cached key on subsequent calls', () => {
    const mod = loadCommonModule()
    mod.setEncryptionKey('cached-key', false)
    expect(mod.loadEncryptionKey()).toBe('cached-key')
    expect(mod.loadEncryptionKey()).toBe('cached-key')
  })

  it('reports insecure=true when set', () => {
    const mod = loadCommonModule()
    mod.setEncryptionKey('key', true)
    expect(mod.isEncryptionKeyInsecure()).toBe(true)
  })

  it('reports insecure=false when set', () => {
    const mod = loadCommonModule()
    mod.setEncryptionKey('key', false)
    expect(mod.isEncryptionKeyInsecure()).toBe(false)
  })

  it('returns false for isEncryptionKeyInsecure before key is set', () => {
    const mod = loadCommonModule()
    expect(mod.isEncryptionKeyInsecure()).toBe(false)
  })
})

describe('backend/lib/encryption_key (main process)', () => {
  describe('safeStorage available', () => {
    it('fresh install: generates 64-char hex key and creates .encryption-key file', () => {
      const mod = loadMainModule()
      const key = mod.loadEncryptionKey()
      expect(key).toMatch(/^[0-9a-f]{64}$/)
      expect(fs.existsSync(path.join(userDirectory, '.encryption-key'))).toBe(true)
      expect(fs.existsSync(path.join(userDirectory, '.key'))).toBe(false)
    })

    it('existing .encryption-key: reads and decrypts correctly', () => {
      const expectedKey = crypto.randomBytes(32).toString('hex')
      const encrypted = Buffer.from('SAFE:' + expectedKey)
      fs.writeFileSync(path.join(userDirectory, '.encryption-key'), encrypted)

      const mod = loadMainModule()
      const key = mod.loadEncryptionKey()
      expect(key).toBe(expectedKey)
    })

    it('migration from .key: reads old file, creates .encryption-key, deletes .key', () => {
      const legacyKey = crypto.randomBytes(32).toString('hex')
      const encryptor = Encryptor(defaultEncryptionKey)
      const encryptedLegacy = encryptor.encrypt({ encryptionKey: legacyKey })
      fs.writeFileSync(path.join(userDirectory, '.key'), encryptedLegacy, 'UTF8')

      const mod = loadMainModule()
      const key = mod.loadEncryptionKey()
      expect(key).toBe(legacyKey)
      expect(fs.existsSync(path.join(userDirectory, '.encryption-key'))).toBe(true)
      expect(fs.existsSync(path.join(userDirectory, '.key'))).toBe(false)
    })

    it('prefers .encryption-key when both .encryption-key and .key exist', () => {
      const keychainKey = crypto.randomBytes(32).toString('hex')
      const legacyKey = crypto.randomBytes(32).toString('hex')

      fs.writeFileSync(path.join(userDirectory, '.encryption-key'), Buffer.from('SAFE:' + keychainKey))

      const encryptor = Encryptor(defaultEncryptionKey)
      fs.writeFileSync(path.join(userDirectory, '.key'), encryptor.encrypt({ encryptionKey: legacyKey }), 'UTF8')

      const mod = loadMainModule()
      const key = mod.loadEncryptionKey()
      expect(key).toBe(keychainKey)
    })

    it('returns cached key on subsequent calls', () => {
      const mod = loadMainModule()
      const key1 = mod.loadEncryptionKey()
      const key2 = mod.loadEncryptionKey()
      expect(key1).toBe(key2)
    })

    it('reports secure (isEncryptionKeyInsecure = false)', () => {
      const mod = loadMainModule()
      mod.loadEncryptionKey()
      expect(mod.isEncryptionKeyInsecure()).toBe(false)
    })
  })

  describe('safeStorage unavailable', () => {
    beforeEach(() => {
      mockSafeStorageAvailable = false
    })

    it('fresh install: creates .key file (fallback)', () => {
      const mod = loadMainModule()
      const key = mod.loadEncryptionKey()
      expect(key).toMatch(/^[0-9a-f]{64}$/)
      expect(fs.existsSync(path.join(userDirectory, '.key'))).toBe(true)
      expect(fs.existsSync(path.join(userDirectory, '.encryption-key'))).toBe(false)
    })

    it('existing .key: reads correctly', () => {
      const legacyKey = crypto.randomBytes(32).toString('hex')
      const encryptor = Encryptor(defaultEncryptionKey)
      const encryptedLegacy = encryptor.encrypt({ encryptionKey: legacyKey })
      fs.writeFileSync(path.join(userDirectory, '.key'), encryptedLegacy, 'UTF8')

      const mod = loadMainModule()
      const key = mod.loadEncryptionKey()
      expect(key).toBe(legacyKey)
    })

    it('reports insecure (isEncryptionKeyInsecure = true)', () => {
      const mod = loadMainModule()
      mod.loadEncryptionKey()
      expect(mod.isEncryptionKeyInsecure()).toBe(true)
    })
  })

  describe('error handling', () => {
    it('returns false for isEncryptionKeyInsecure before loadEncryptionKey', () => {
      const mod = loadMainModule()
      expect(mod.isEncryptionKeyInsecure()).toBe(false)
    })

    it('corrupted .encryption-key throws error', () => {
      fs.writeFileSync(path.join(userDirectory, '.encryption-key'), Buffer.from('corrupted-data'))

      const mod = loadMainModule()
      expect(() => mod.loadEncryptionKey()).toThrow(/Could not decrypt saved credentials/)
    })

    it('corrupted legacy .key file throws error', () => {
      fs.writeFileSync(path.join(userDirectory, '.key'), 'not-valid-encrypted-data', 'UTF8')

      const mod = loadMainModule()
      expect(() => mod.loadEncryptionKey()).toThrow(/may be corrupted/)
    })

    it('migration continues if legacy file deletion fails', () => {
      const legacyKey = crypto.randomBytes(32).toString('hex')
      const encryptor = Encryptor(defaultEncryptionKey)
      const encryptedLegacy = encryptor.encrypt({ encryptionKey: legacyKey })
      fs.writeFileSync(path.join(userDirectory, '.key'), encryptedLegacy, 'UTF8')

      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const mod = loadMainModule()
      const key = mod.loadEncryptionKey()
      expect(key).toBe(legacyKey)
      expect(fs.existsSync(path.join(userDirectory, '.encryption-key'))).toBe(true)

      jest.restoreAllMocks()
    })
  })
})
