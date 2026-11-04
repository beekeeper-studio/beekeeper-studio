import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { dbtimeout } from '@tests/lib/db'
import { createServer } from '@commercial/backend/lib/db/server'
import { MysqlSessionVariable } from '@/lib/db/types'

describe('MySQL session variables', () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

  let container: StartedTestContainer

  beforeAll(async () => {
    container = await new GenericContainer('mysql:8')
      .withName('testmysql_session_vars')
      .withEnvironment({ MYSQL_ROOT_PASSWORD: 'test', MYSQL_DATABASE: 'test' })
      .withExposedPorts(3306)
      .withStartupTimeout(dbtimeout)
      .start()
  })

  afterAll(async () => {
    await container?.stop()
  })

  function connectionWith(sessionVariables: MysqlSessionVariable[]) {
    const server = createServer({
      client: 'mysql',
      host: container.getHost(),
      port: container.getMappedPort(3306),
      user: 'root',
      password: 'test',
      options: { sessionVariables },
    } as any)
    return server.createConnection('test')
  }

  it('applies the variables to every pooled connection', async () => {
    const connection = connectionWith([
      { name: 'collation_connection', value: 'utf8mb4_unicode_520_ci' },
      { name: 'sql_mode', value: 'ANSI_QUOTES,STRICT_TRANS_TABLES' },
      { name: 'time_zone', value: '+03:00' },
      { name: 'wait_timeout', value: '1234' },
    ])
    await connection.connect()
    try {
      // run in parallel so the pool has to open more than one connection
      const results = await Promise.all([1, 2, 3].map(() => connection.executeQuery(`
        SELECT CONNECTION_ID() AS id,
          @@SESSION.collation_connection AS collation,
          @@SESSION.sql_mode AS sql_mode,
          @@SESSION.time_zone AS time_zone,
          @@SESSION.wait_timeout AS wait_timeout,
          SLEEP(0.3) AS s
      `)))
      const rows = results.map((r) => r[0].rows[0])

      expect(new Set(rows.map((r) => r.id)).size).toBeGreaterThan(1)
      for (const row of rows) {
        expect(row).toMatchObject({
          collation: 'utf8mb4_unicode_520_ci',
          sql_mode: 'ANSI_QUOTES,STRICT_TRANS_TABLES',
          time_zone: '+03:00',
        })
        expect(Number(row.wait_timeout)).toBe(1234)
      }
    } finally {
      await connection.disconnect()
    }
  })

  it('fails to connect with an unknown variable', async () => {
    const connection = connectionWith([{ name: 'not_a_real_variable', value: '1' }])
    await expect(connection.connect()).rejects.toThrow(/not_a_real_variable/)
    await connection.disconnect()
  })

  it('fails to connect with an invalid variable name', async () => {
    const connection = connectionWith([{ name: 'sql_mode; DROP DATABASE test', value: '1' }])
    await expect(connection.connect()).rejects.toThrow(/Invalid session variable name/)
  })
})
