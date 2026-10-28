import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import { createServer } from '@commercial/backend/lib/db/server'
import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import { dbtimeout } from '@tests/lib/db'

// Runs against real BigQuery; the emulator has no constraint metadata.
// .github/workflows/cloud-db-tests.yml creates a dataset for the run, runs this
// spec and deletes the dataset again. The spec self-skips unless
// BIGQUERY_PROJECT_ID and BIGQUERY_DATASET are set, so the per-database
// integration matrix (which discovers every spec under
// tests/vitest/integration/lib/db) passes over it.
//
// Credentials come from BIGQUERY_KEY_FILE (a service account key) or, when
// that is unset, Application Default Credentials.
//
// Locally: BIGQUERY_PROJECT_ID=... BIGQUERY_DATASET=... \
//   yarn test:integration tests/vitest/integration/lib/db/clients/bigquery.spec.ts
//
// Tables carry a per-run prefix and are dropped afterwards, so an existing
// dataset can be reused.

const projectId = process.env.BIGQUERY_PROJECT_ID
const dataset = process.env.BIGQUERY_DATASET
// Set by the workflow, so a missing variable fails the run instead of
// skipping the spec (a skipped spec looks like a passing one).
if (process.env.CLOUD_DB_TESTS_REQUIRED === '1' && !(projectId && dataset)) {
  throw new Error('BIGQUERY_PROJECT_ID and BIGQUERY_DATASET must be set')
}
const describeBigQuery = projectId && dataset ? describe : describe.skip

const prefix = `bks_${Date.now()}_${Math.floor(Math.random() * 10000)}_`
const parent = `${prefix}parent`
const other = `${prefix}other`
const child = `${prefix}child`
const swapped = `${prefix}swapped`

describeBigQuery('BigQuery (live) integration tests', () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

  let connection: BasicDatabaseClient<any>
  const table = (name: string) => `\`${dataset}.${name}\``

  beforeAll(async () => {
    const server = createServer({
      client: 'bigquery',
      bigQueryOptions: {
        projectId,
        keyFilename: process.env.BIGQUERY_KEY_FILE || undefined,
      },
    } as any)
    connection = server.createConnection(dataset)
    await connection.connect()

    await connection.executeQuery(`
      CREATE TABLE ${table(parent)} (
        a INT64 NOT NULL, b INT64 NOT NULL, name STRING,
        PRIMARY KEY (a, b) NOT ENFORCED
      );
      CREATE TABLE ${table(other)} (id INT64 NOT NULL, PRIMARY KEY (id) NOT ENFORCED);
      CREATE TABLE ${table(child)} (
        id INT64 NOT NULL,
        ref_a INT64,
        ref_b INT64,
        other_id INT64,
        PRIMARY KEY (id) NOT ENFORCED,
        CONSTRAINT child_parent_fk FOREIGN KEY (ref_a, ref_b) REFERENCES ${table(parent)} (a, b) NOT ENFORCED,
        CONSTRAINT child_other_fk FOREIGN KEY (other_id) REFERENCES ${table(other)} (id) NOT ENFORCED
      );
    `)
  })

  afterAll(async () => {
    if (!connection) return
    for (const name of [swapped, child, other, parent]) {
      await connection.executeQuery(`DROP TABLE IF EXISTS ${table(name)}`).catch(() => null)
    }
    await connection.disconnect()
  })

  it('pairs the columns of a composite outgoing key', async () => {
    const keys = await connection.getOutgoingKeys(child)
    expect(keys).toHaveLength(2)
    expect(keys.find((k) => k.constraintName === 'child_parent_fk')).toMatchObject({
      fromTable: child,
      fromColumn: ['ref_a', 'ref_b'],
      toTable: parent,
      toColumn: ['a', 'b'],
      isComposite: true,
    })
  })

  it('reads single-column outgoing keys', async () => {
    const keys = await connection.getOutgoingKeys(child)
    expect(keys.find((k) => k.constraintName === 'child_other_fk')).toMatchObject({
      fromColumn: 'other_id',
      toTable: other,
      toColumn: 'id',
      isComposite: false,
    })
  })

  it('pairs the columns of a composite incoming key', async () => {
    const keys = await connection.getIncomingKeys(parent)
    expect(keys.find((k) => k.constraintName === 'child_parent_fk')).toMatchObject({
      fromTable: child,
      fromColumn: ['ref_a', 'ref_b'],
      toTable: parent,
      toColumn: ['a', 'b'],
      isComposite: true,
    })
  })

  // A key listing the primary key columns out of order: pairing must follow
  // the primary key position, not the column order of either table.
  describe('with referenced columns out of primary key order', () => {
    beforeAll(async () => {
      await connection.executeQuery(`
        CREATE TABLE ${table(swapped)} (
          id INT64 NOT NULL,
          ref_b INT64,
          ref_a INT64,
          CONSTRAINT swapped_parent_fk FOREIGN KEY (ref_b, ref_a) REFERENCES ${table(parent)} (b, a) NOT ENFORCED
        )
      `)
    })

    it('pairs each column with the one it references', async () => {
      const keys = await connection.getOutgoingKeys(swapped)
      expect(keys).toHaveLength(1)
      expect(keys[0]).toMatchObject({
        constraintName: 'swapped_parent_fk',
        fromColumn: ['ref_b', 'ref_a'],
        toTable: parent,
        toColumn: ['b', 'a'],
        isComposite: true,
      })
    })
  })
})
