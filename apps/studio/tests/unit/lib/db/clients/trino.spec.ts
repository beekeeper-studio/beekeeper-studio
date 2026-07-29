const capturedQueries: string[] = []
// When non-empty, the mocked query iterator yields these instead of the
// default single-row result. Reset it in beforeEach.
const mockQueryResults: Record<string, any>[] = []

jest.mock('trino-client', () => {
  const mockQuery = jest.fn().mockImplementation((sql: string) => {
    capturedQueries.push(sql)
    const results = mockQueryResults.length
      ? [...mockQueryResults]
      : [{
          data: [['1.0.0']],
          columns: [{ name: '_col0', type: 'varchar' }]
        }]
    return Promise.resolve({
      [Symbol.asyncIterator]: async function* () {
        yield* results
      }
    })
  })

  return {
    Trino: {
      create: jest.fn().mockReturnValue({ query: mockQuery })
    },
    BasicAuth: jest.fn().mockImplementation((user, pass) => ({ type: 'basic', username: user, password: pass })),
  }
})

import fs from 'fs'
import os from 'os'
import path from 'path'
import { Trino as TrinoNodeClient } from 'trino-client'
import { TrinoClient } from '@commercial/backend/lib/db/clients/trino'
import { IDbConnectionServer } from '@/lib/db/backendTypes'
import { IDbConnectionDatabase } from '@/lib/db/types'

function makeServer(overrides: Partial<IDbConnectionServer['config']> = {}): IDbConnectionServer {
  return {
    db: {},
    config: {
      client: 'trino',
      host: 'localhost',
      port: 8080,
      user: 'testuser',
      password: null,
      readOnlyMode: false,
      osUser: 'testuser',
      ssh: null,
      sslCaFile: null,
      sslCertFile: null,
      sslKeyFile: null,
      sslRejectUnauthorized: false,
      ssl: false,
      domain: null,
      socketPath: null,
      socketPathEnabled: false,
      ...overrides,
    },
  } as IDbConnectionServer
}

function makeDatabase(): IDbConnectionDatabase {
  return {
    database: 'postgresql',
    connected: false,
    connecting: false,
    namespace: null,
  }
}

describe('TrinoClient SSL configuration (bug #3695)', () => {
  let tmpDir: string
  let caFile: string
  let certFile: string
  let keyFile: string

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trino-test-'))
    caFile = path.join(tmpDir, 'ca.pem')
    certFile = path.join(tmpDir, 'cert.pem')
    keyFile = path.join(tmpDir, 'key.pem')
    fs.writeFileSync(caFile, 'fake-ca')
    fs.writeFileSync(certFile, 'fake-cert')
    fs.writeFileSync(keyFile, 'fake-key')
  })

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should pass ssl options to Trino.create() when ssl is true', async () => {
    const server = makeServer({ ssl: true })
    const client = new TrinoClient(server, makeDatabase())
    await client.connect()

    const createCall = (TrinoNodeClient.create as jest.Mock).mock.calls[0][0]
    expect(createCall.ssl).toBeDefined()
  })

  it('should use https protocol when ssl is true', async () => {
    const server = makeServer({ ssl: true })
    const client = new TrinoClient(server, makeDatabase())
    await client.connect()

    const createCall = (TrinoNodeClient.create as jest.Mock).mock.calls[0][0]
    expect(createCall.server).toContain('https')
  })

  it('should pass ssl cert/key/ca files when configured', async () => {
    const server = makeServer({
      ssl: true,
      sslCaFile: caFile,
      sslCertFile: certFile,
      sslKeyFile: keyFile,
    })
    const client = new TrinoClient(server, makeDatabase())
    await client.connect()

    const createCall = (TrinoNodeClient.create as jest.Mock).mock.calls[0][0]
    expect(createCall.ssl).toBeDefined()
    expect(createCall.ssl.ca).toBeDefined()
    expect(createCall.ssl.cert).toBeDefined()
    expect(createCall.ssl.key).toBeDefined()
  })

  it('should set rejectUnauthorized based on config', async () => {
    const server = makeServer({
      ssl: true,
      sslRejectUnauthorized: false,
    })
    const client = new TrinoClient(server, makeDatabase())
    await client.connect()

    const createCall = (TrinoNodeClient.create as jest.Mock).mock.calls[0][0]
    expect(createCall.ssl).toBeDefined()
    expect(createCall.ssl.rejectUnauthorized).toBe(false)
  })

  it('should not pass ssl options when ssl is false', async () => {
    const server = makeServer({ ssl: false })
    const client = new TrinoClient(server, makeDatabase())
    await client.connect()

    const createCall = (TrinoNodeClient.create as jest.Mock).mock.calls[0][0]
    expect(createCall.ssl).toBeUndefined()
  })
})

describe('TrinoClient SQL escaping', () => {
  let client: TrinoClient

  beforeEach(async () => {
    jest.clearAllMocks()
    capturedQueries.length = 0
    client = new TrinoClient(makeServer(), makeDatabase())
    await client.connect()
    capturedQueries.length = 0
  })

  it('should wrap catalog name with identifier quoting in listSchemas', async () => {
    const maliciousDb = "cat; DROP TABLE users --"
    ;(client as any).db = maliciousDb
    await client.listSchemas(null)

    const sql = capturedQueries[0]
    // Catalog name must be inside double-quote identifiers
    expect(sql).toContain('"cat; DROP TABLE users --"')
  })

  it('should wrap catalog name with identifier quoting in listTables', async () => {
    const maliciousDb = "cat; DROP TABLE users --"
    ;(client as any).db = maliciousDb
    await client.listTables(null)

    const sql = capturedQueries[0]
    // Catalog name must be inside double-quote identifiers
    expect(sql).toContain('"cat; DROP TABLE users --".information_schema')
  })

  it('should escape schema and table names in listTableColumns', async () => {
    await client.listTableColumns("test'; DROP TABLE users --", "public'; DROP TABLE users --")

    const sql = capturedQueries[0]
    // Single quotes in values must be doubled to stay inside SQL string literals
    expect(sql).toContain("public''; DROP TABLE users --")
    expect(sql).toContain("test''; DROP TABLE users --")
  })
})

describe('TrinoClient query error handling (bug #4489)', () => {
  let client: TrinoClient

  beforeEach(async () => {
    jest.clearAllMocks()
    mockQueryResults.length = 0
    client = new TrinoClient(makeServer(), makeDatabase())
    await client.connect()
  })

  it('should throw when trino yields an error result instead of returning 0 rows', async () => {
    mockQueryResults.push({
      id: 'q-1',
      error: {
        message: "line 1:1: mismatched input 'SELCT'",
        errorCode: 1,
        errorName: 'SYNTAX_ERROR',
        errorType: 'USER_ERROR',
      },
    })

    await expect(client.executeQuery('SELCT 1')).rejects.toThrow(
      "SYNTAX_ERROR: line 1:1: mismatched input 'SELCT'"
    )
  })

  it('should throw even when the error arrives after partial data', async () => {
    mockQueryResults.push(
      {
        id: 'q-2',
        data: [['partial']],
        columns: [{ name: '_col0', type: 'varchar' }],
      },
      {
        id: 'q-2',
        error: {
          message: 'Query exceeded per-node memory limit',
          errorCode: 2,
          errorName: 'EXCEEDED_LOCAL_MEMORY_LIMIT',
          errorType: 'INSUFFICIENT_RESOURCES',
        },
      }
    )

    await expect(client.executeQuery('SELECT huge')).rejects.toThrow(
      'EXCEEDED_LOCAL_MEMORY_LIMIT: Query exceeded per-node memory limit'
    )
  })

  it('should still return rows for successful queries', async () => {
    const results = await client.executeQuery('SELECT 1')
    expect(results[0].rows).toEqual([{ _col0: '1.0.0' }])
  })
})
