import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'
import oracledb from 'oracledb'
import { createServer } from '@commercial/backend/lib/db/server'
import { dbtimeout } from '@tests/lib/db'

// Shared by oracle-role-thin.spec.ts and oracle-role-thick.spec.ts. Thin and
// thick mode can't be mixed in one process (initOracleClient is global and
// permanent), so each mode gets its own spec file and worker.
export function runOracleRoleTests(mode: 'thin' | 'thick') {
  const instantClientLocation = mode === 'thick' ? process.env.ORACLE_CLI_PATH : undefined

  // bin/integration-tests.sh downloads the Instant Client and sets
  // ORACLE_CLI_PATH; without it there is no way to run in thick mode.
  describe.skipIf(mode === 'thick' && !instantClientLocation)(`Oracle roles (${mode} mode)`, () => {
    vi.setConfig({ testTimeout: dbtimeout, hookTimeout: 1000 * 60 * 5 })

    let container: StartedTestContainer
    const connections = []

    beforeAll(async () => {
      container = await new GenericContainer('gvenzl/oracle-xe:18')
        .withEnvironment({ ORACLE_PASSWORD: 'password' })
        .withExposedPorts(1521)
        .withWaitStrategy(Wait.forLogMessage('DATABASE IS READY TO USE!'))
        .withStartupTimeout(1000 * 60 * 5)
        .start()
    })

    afterEach(async () => {
      await Promise.all(connections.splice(0).map((c) => c.disconnect()))
    })

    afterAll(async () => {
      await container?.stop()
    })

    async function connect(user: string, privilege?: 'SYSDBA' | 'SYSOPER') {
      const server = createServer({
        client: 'oracle',
        host: container.getHost(),
        port: container.getMappedPort(1521),
        user,
        password: 'password',
        serviceName: 'XEPDB1',
        instantClientLocation,
        options: { connectionMethod: 'manual', privilege },
      } as any)
      const connection = server.createConnection('XEPDB1')
      connections.push(connection)
      await connection.connect()
      return connection
    }

    // Maps a result row from column ids to column names
    function firstRow(result) {
      return Object.fromEntries(result.fields.map((f) => [f.name, result.rows[0][f.id]]))
    }

    const sessionSql = `SELECT USER AS USERNAME, SYS_CONTEXT('USERENV', 'ISDBA') AS ISDBA FROM DUAL`

    it(`runs in ${mode} mode`, async () => {
      await connect('SYSTEM')
      expect(oracledb.thin).toBe(mode === 'thin')
    })

    it('rejects SYS without a role', async () => {
      await expect(connect('SYS')).rejects.toThrow(/ORA-28009/)
    })

    it('connects as SYS with SYSDBA', async () => {
      const connection = await connect('SYS', 'SYSDBA')
      const [result] = await connection.executeQuery(sessionSql)
      expect(firstRow(result)).toEqual({ USERNAME: 'SYS', ISDBA: 'TRUE' })
    })

    it('connects as SYS with SYSOPER', async () => {
      // SYSOPER sessions run as the PUBLIC schema
      const connection = await connect('SYS', 'SYSOPER')
      const [result] = await connection.executeQuery(sessionSql)
      expect(firstRow(result)).toEqual({ USERNAME: 'PUBLIC', ISDBA: 'FALSE' })
    })

    it('connects a regular user with the default role', async () => {
      const connection = await connect('SYSTEM')
      const [result] = await connection.executeQuery(sessionSql)
      expect(firstRow(result)).toEqual({ USERNAME: 'SYSTEM', ISDBA: 'FALSE' })
    })

    it('keeps the role on reserved connections', async () => {
      const connection = await connect('SYS', 'SYSDBA')
      const tabId = 1
      await connection.reserveConnection(tabId)
      try {
        const [result] = await (await connection.query(sessionSql, tabId)).execute()
        expect(firstRow(result)).toEqual({ USERNAME: 'SYS', ISDBA: 'TRUE' })
      } finally {
        await connection.releaseConnection(tabId)
      }
    })

    it('keeps the role on streamed queries', async () => {
      const connection = await connect('SYS', 'SYSDBA')
      const { cursor } = await connection.queryStream(sessionSql, 10)
      await cursor.start()
      try {
        const rows = await cursor.read()
        expect(rows).toEqual([['SYS', 'TRUE']])
      } finally {
        await cursor.close()
      }
    })
  })
}
