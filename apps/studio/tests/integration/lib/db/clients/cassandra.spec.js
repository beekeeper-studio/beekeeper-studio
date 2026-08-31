import { GenericContainer, Wait } from 'testcontainers'
import { dbtimeout } from '../../../../lib/db'
import { createServer } from '@commercial/backend/lib/db/server'

describe("Cassandra Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let server;
  let connection;

  beforeAll(async () => {
    container = await new GenericContainer("cassandra:4.1")
      .withName("cassandra_test")
      .withExposedPorts(9042)
      .withEnvironment({
        MAX_HEAP_SIZE: "512M",
        HEAP_NEWSIZE: "128M",
        CASSANDRA_DC: "datacenter1",
        CASSANDRA_ENDPOINT_SNITCH: "GossipingPropertyFileSnitch",
      })
      .withWaitStrategy(Wait.forLogMessage(/Starting listening for CQL clients/))
      .withStartupTimeout(dbtimeout)
      .start()

    const config = {
      client: 'cassandra',
      host: container.getHost(),
      port: container.getMappedPort(9042),
      cassandraOptions: {
        localDataCenter: 'datacenter1',
      },
    }

    server = createServer(config)
    connection = server.createConnection(null)
    await connection.connect()
  })

  afterAll(async () => {
    if (connection) {
      await connection.disconnect()
    }
    if (container) {
      await container.stop()
    }
  })

  // Regression test: the filter callback in CassandraChangeBuilder.alterTable used a
  // block body without a return statement, so renameColumnAlterations was always empty
  // and ALTER TABLE … RENAME … SQL was never generated.
  describe("Column rename via alterTable", () => {
    const KEYSPACE = 'alter_rename_test_ks'
    let renameConnection

    beforeAll(async () => {
      await connection.executeQuery(
        `CREATE KEYSPACE IF NOT EXISTS ${KEYSPACE} WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`
      )
      await connection.executeQuery(`
        CREATE TABLE IF NOT EXISTS ${KEYSPACE}.cluster_rename_test (
          bucket uuid,
          ts timeuuid,
          value text,
          PRIMARY KEY (bucket, ts)
        )
      `)

      // Create a second connection targeting this keyspace so that
      // alterTable generates unqualified SQL that Cassandra can resolve.
      renameConnection = server.createConnection(KEYSPACE)
      await renameConnection.connect()
    })

    afterAll(async () => {
      if (renameConnection) await renameConnection.disconnect()
      await connection.executeQuery(`DROP KEYSPACE IF EXISTS ${KEYSPACE}`)
    })

    it("should rename a clustering column end-to-end", async () => {
      await renameConnection.alterTable({
        table: 'cluster_rename_test',
        adds: [],
        drops: [],
        alterations: [
          { columnName: 'ts', changeType: 'columnName', newValue: 'event_time' }
        ]
      })

      const columns = await renameConnection.listTableColumns('cluster_rename_test')
      expect(columns.find((c) => c.columnName === 'event_time')).toBeTruthy()
      expect(columns.find((c) => c.columnName === 'ts')).toBeFalsy()
    })
  })

  it("Should connect to Cassandra", async () => {
    const version = await connection.versionString()
    expect(version).toBeTruthy()
  })

  it("Should list keyspaces", async () => {
    const databases = await connection.listDatabases()
    expect(databases).toContain('system')
  })

  it("Should convert UUIDs in list, set, and map collections to strings", async () => {
    const keyspace = 'uuid_collection_test'

    await connection.executeQuery(
      `CREATE KEYSPACE IF NOT EXISTS ${keyspace} WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`
    )
    await connection.executeQuery(`
      CREATE TABLE IF NOT EXISTS ${keyspace}.collections (
        id UUID PRIMARY KEY,
        uuid_list LIST<UUID>,
        uuid_set SET<UUID>,
        uuid_uuid_map MAP<UUID, UUID>,
        text_uuid_map MAP<TEXT, UUID>
      )
    `)

    const rowId = '11111111-2222-3333-4444-555555555555'
    const listA = '550e8400-e29b-41d4-a716-446655440000'
    const listB = '550e8400-e29b-41d4-a716-446655440001'
    const setA = '550e8400-e29b-41d4-a716-446655440002'
    const setB = '550e8400-e29b-41d4-a716-446655440003'
    const mapKey = '550e8400-e29b-41d4-a716-446655440004'
    const mapVal = '550e8400-e29b-41d4-a716-446655440005'
    const textVal = '550e8400-e29b-41d4-a716-446655440006'

    await connection.executeQuery(`
      INSERT INTO ${keyspace}.collections (id, uuid_list, uuid_set, uuid_uuid_map, text_uuid_map)
      VALUES (
        ${rowId},
        [${listA}, ${listB}],
        {${setA}, ${setB}},
        {${mapKey}: ${mapVal}},
        {'first': ${textVal}}
      )
    `)

    const results = await connection.executeQuery(
      `SELECT * FROM ${keyspace}.collections WHERE id = ${rowId}`
    )
    expect(results[0].rows).toHaveLength(1)
    const row = results[0].rows[0]

    // top-level UUID column stays string (regression guard)
    expect(typeof row.id).toBe('string')
    expect(row.id).toBe(rowId)

    // LIST<UUID>
    expect(Array.isArray(row.uuid_list)).toBe(true)
    expect(row.uuid_list).toEqual([listA, listB])
    row.uuid_list.forEach((v) => expect(typeof v).toBe('string'))

    // SET<UUID> (order is not guaranteed)
    expect(Array.isArray(row.uuid_set)).toBe(true)
    expect([...row.uuid_set].sort()).toEqual([setA, setB].sort())
    row.uuid_set.forEach((v) => expect(typeof v).toBe('string'))

    // MAP<UUID, UUID>
    expect(row.uuid_uuid_map).not.toBeNull()
    expect(typeof row.uuid_uuid_map).toBe('object')
    expect(Array.isArray(row.uuid_uuid_map)).toBe(false)
    expect(Object.keys(row.uuid_uuid_map)).toEqual([mapKey])
    expect(row.uuid_uuid_map[mapKey]).toBe(mapVal)

    // MAP<TEXT, UUID>
    expect(typeof row.text_uuid_map).toBe('object')
    expect(row.text_uuid_map.first).toBe(textVal)
  })
})
