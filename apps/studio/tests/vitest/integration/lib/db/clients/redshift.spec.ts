import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { createServer } from '@commercial/backend/lib/db/server'
import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import { dbtimeout } from '@tests/lib/db'

// Runs against a real Amazon Redshift cluster; there is no Redshift container.
// .github/workflows/cloud-db-tests.yml resumes the cluster, runs this spec and
// pauses the cluster again. The spec self-skips unless REDSHIFT_HOST is set,
// so the per-database integration matrix (which discovers every spec under
// tests/vitest/integration/lib/db) passes over it.
//
// Locally: REDSHIFT_HOST=... REDSHIFT_USER=... REDSHIFT_PASSWORD=... \
//   yarn test:integration tests/vitest/integration/lib/db/clients/redshift.spec.ts
//
// Everything is created in two throwaway schemas that are dropped afterwards.

const host = process.env.REDSHIFT_HOST
// Set by the workflow, so a missing variable fails the run instead of
// skipping the spec (a skipped spec looks like a passing one).
if (process.env.CLOUD_DB_TESTS_REQUIRED === '1' && !host) {
  throw new Error('REDSHIFT_HOST is not set')
}
const describeRedshift = host ? describe : describe.skip

const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`
// Two schemas with identical tables, so constraint names (`parent_pkey`,
// `child_parent_fk`) repeat across schemas.
const schema = `bks_fk_${suffix}`
const otherSchema = `bks_fk_other_${suffix}`

describeRedshift('Redshift (live cluster) integration tests', () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

  let connection: BasicDatabaseClient<any>

  beforeAll(async () => {
    const server = createServer({
      client: 'redshift',
      host,
      port: Number(process.env.REDSHIFT_PORT || 5439),
      user: process.env.REDSHIFT_USER,
      password: process.env.REDSHIFT_PASSWORD,
      ssl: process.env.REDSHIFT_SSL !== '0',
      sslRejectUnauthorized: false,
    } as any)
    connection = server.createConnection(process.env.REDSHIFT_DATABASE || 'dev')
    await connection.connect()

    for (const s of [schema, otherSchema]) {
      // The composite key lists the referenced columns in the reverse order
      // of the primary key, so pairing by position is what is being tested.
      await connection.executeQuery(`
        CREATE SCHEMA ${s};
        CREATE TABLE ${s}.parent (a INT NOT NULL, b INT NOT NULL, name VARCHAR(20), PRIMARY KEY (a, b));
        CREATE TABLE ${s}.other (id INT NOT NULL PRIMARY KEY);
        CREATE TABLE ${s}.child (
          id INT NOT NULL PRIMARY KEY,
          ref_b INT,
          ref_a INT,
          other_id INT,
          CONSTRAINT child_parent_fk FOREIGN KEY (ref_b, ref_a) REFERENCES ${s}.parent (b, a),
          CONSTRAINT child_other_fk FOREIGN KEY (other_id) REFERENCES ${s}.other (id)
        );
      `)
    }
  })

  afterAll(async () => {
    if (!connection) return
    for (const s of [schema, otherSchema]) {
      await connection.executeQuery(`DROP SCHEMA IF EXISTS ${s} CASCADE`).catch(() => null)
    }
    await connection.disconnect()
  })

  it('pairs the columns of a composite outgoing key', async () => {
    const keys = await connection.getOutgoingKeys('child', schema)
    const composite = keys.find((k) => k.constraintName === 'child_parent_fk')

    expect(keys).toHaveLength(2)
    expect(composite).toMatchObject({
      fromSchema: schema,
      fromTable: 'child',
      fromColumn: ['ref_b', 'ref_a'],
      toSchema: schema,
      toTable: 'parent',
      toColumn: ['b', 'a'],
      isComposite: true,
    })
  })

  it('reads single-column outgoing keys', async () => {
    const keys = await connection.getOutgoingKeys('child', schema)
    expect(keys.find((k) => k.constraintName === 'child_other_fk')).toMatchObject({
      fromColumn: 'other_id',
      toSchema: schema,
      toTable: 'other',
      toColumn: 'id',
      isComposite: false,
    })
  })

  it('pairs the columns of a composite incoming key', async () => {
    const keys = await connection.getIncomingKeys('parent', schema)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatchObject({
      constraintName: 'child_parent_fk',
      fromSchema: schema,
      fromTable: 'child',
      fromColumn: ['ref_b', 'ref_a'],
      toTable: 'parent',
      toColumn: ['b', 'a'],
      isComposite: true,
    })
  })

  it('keeps keys in schemas that reuse constraint names apart', async () => {
    const incoming = await connection.getIncomingKeys('other', otherSchema)
    expect(incoming).toHaveLength(1)
    expect(incoming[0]).toMatchObject({
      fromSchema: otherSchema,
      fromTable: 'child',
      fromColumn: 'other_id',
      toSchema: otherSchema,
    })
  })

  it('reads table keys without failing', async () => {
    const keys = await connection.getTableKeys('child', schema)
    expect(keys.map((k) => k.constraintName).sort()).toEqual(['child_other_fk', 'child_parent_fk'])
  })
})
