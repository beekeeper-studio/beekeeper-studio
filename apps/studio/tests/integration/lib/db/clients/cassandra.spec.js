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

  it("Should convert UUIDs nested inside user defined types to strings", async () => {
    const keyspace = 'uuid_udt_test'

    await connection.executeQuery(
      `CREATE KEYSPACE IF NOT EXISTS ${keyspace} WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`
    )
    // a udt with a uuid field, used both as a bare column and as the element
    // type of a collection, plus a udt nested inside another udt
    await connection.executeQuery(`
      CREATE TYPE IF NOT EXISTS ${keyspace}.item_ref (
        id UUID,
        position INT
      )
    `)
    await connection.executeQuery(`
      CREATE TYPE IF NOT EXISTS ${keyspace}.wrapper_type (
        label TEXT,
        inner FROZEN<item_ref>
      )
    `)
    await connection.executeQuery(`
      CREATE TABLE IF NOT EXISTS ${keyspace}.nested_udt (
        username TEXT PRIMARY KEY,
        single FROZEN<item_ref>,
        item_list SET<FROZEN<item_ref>>,
        nested FROZEN<wrapper_type>
      )
    `)

    const singleId = '660e8400-e29b-41d4-a716-446655440000'
    const setIdA = '660e8400-e29b-41d4-a716-446655440001'
    const setIdB = '660e8400-e29b-41d4-a716-446655440002'
    const nestedId = '660e8400-e29b-41d4-a716-446655440003'

    await connection.executeQuery(`
      INSERT INTO ${keyspace}.nested_udt (username, single, item_list, nested)
      VALUES (
        'test_user',
        {id: ${singleId}, position: 1},
        {{id: ${setIdA}, position: 2}, {id: ${setIdB}, position: 3}},
        {label: 'wrapped', inner: {id: ${nestedId}, position: 4}}
      )
    `)

    const results = await connection.executeQuery(
      `SELECT * FROM ${keyspace}.nested_udt WHERE username = 'test_user'`
    )
    expect(results[0].rows).toHaveLength(1)
    const row = results[0].rows[0]

    // bare FROZEN<udt> column
    expect(row.single).toEqual({ id: singleId, position: 1 })
    expect(typeof row.single.id).toBe('string')

    // SET<FROZEN<udt>> (order is not guaranteed)
    expect(Array.isArray(row.item_list)).toBe(true)
    expect([...row.item_list].sort((a, b) => a.position - b.position)).toEqual([
      { id: setIdA, position: 2 },
      { id: setIdB, position: 3 },
    ])

    // udt nested inside a udt
    expect(row.nested).toEqual({ label: 'wrapped', inner: { id: nestedId, position: 4 } })

    // nothing driver-internal survives the structured clone the IPC boundary
    // performs on its way to the renderer
    expect(structuredClone(row)).toEqual(row)
  })

  it("Should convert numeric and duration types to strings", async () => {
    const keyspace = 'numeric_type_test'

    await connection.executeQuery(
      `CREATE KEYSPACE IF NOT EXISTS ${keyspace} WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`
    )
    await connection.executeQuery(`
      CREATE TYPE IF NOT EXISTS ${keyspace}.metrics_type (
        huge VARINT,
        amount DECIMAL,
        window DURATION
      )
    `)
    await connection.executeQuery(`
      CREATE TABLE IF NOT EXISTS ${keyspace}.numerics (
        name TEXT PRIMARY KEY,
        total BIGINT,
        huge VARINT,
        amount DECIMAL,
        window DURATION,
        zero_window DURATION,
        varint_list LIST<VARINT>,
        metrics FROZEN<metrics_type>
      )
    `)

    // values chosen to be unrepresentable as a JS number
    const huge = '123456789012345678901234567890'
    const amount = '0.10000000000000000001'
    const total = '9007199254740993'

    await connection.executeQuery(`
      INSERT INTO ${keyspace}.numerics (name, total, huge, amount, window, zero_window, varint_list, metrics)
      VALUES (
        'row1',
        ${total},
        ${huge},
        ${amount},
        1mo2d3s,
        0s,
        [${huge}],
        {huge: ${huge}, amount: ${amount}, window: 1mo2d3s}
      )
    `)

    const results = await connection.executeQuery(
      `SELECT * FROM ${keyspace}.numerics WHERE name = 'row1'`
    )
    expect(results[0].rows).toHaveLength(1)
    const row = results[0].rows[0]

    expect(row.total).toBe(total)
    expect(row.huge).toBe(huge)
    expect(row.amount).toBe(amount)
    expect(row.window).toBe('1mo2d3s')
    // a zero duration stringifies to '' in the driver, which would read as unset
    expect(row.zero_window).toBe('0s')
    expect(row.varint_list).toEqual([huge])
    expect(row.metrics).toEqual({ huge, amount, window: '1mo2d3s' })

    expect(structuredClone(row)).toEqual(row)

    // counters live in their own table: Cassandra will not mix them with
    // non-counter columns
    await connection.executeQuery(`
      CREATE TABLE IF NOT EXISTS ${keyspace}.counters (
        name TEXT PRIMARY KEY,
        hits COUNTER
      )
    `)
    await connection.executeQuery(
      `UPDATE ${keyspace}.counters SET hits = hits + ${total} WHERE name = 'row1'`
    )

    const counterResults = await connection.executeQuery(
      `SELECT * FROM ${keyspace}.counters WHERE name = 'row1'`
    )
    const counterRow = counterResults[0].rows[0]
    expect(counterRow.hits).toBe(total)
    expect(structuredClone(counterRow)).toEqual(counterRow)
  })

  it("Should write back the values the grid was shown", async () => {
    // The read side flattens driver classes so they survive IPC, which leaves
    // the grid holding strings and arrays the driver's encoder rejects.
    const keyspace = 'write_back_test'

    await connection.executeQuery(
      `CREATE KEYSPACE IF NOT EXISTS ${keyspace} WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`
    )
    await connection.executeQuery(`
      CREATE TABLE IF NOT EXISTS ${keyspace}.editable (
        id UUID PRIMARY KEY,
        window DURATION,
        zero_window DURATION,
        pair FROZEN<TUPLE<UUID, INT>>,
        huge VARINT,
        amount DECIMAL,
        total BIGINT,
        windows LIST<DURATION>
      )
    `)

    const rowId = '77777777-8888-9999-aaaa-bbbbbbbbbbbb'
    const pairId = '99999999-8888-7777-6666-555555555555'
    const huge = '123456789012345678901234567890'
    const amount = '0.10000000000000000001'
    const total = '9007199254740993'

    await connection.executeQuery(`
      INSERT INTO ${keyspace}.editable (id, window, zero_window, pair, huge, amount, total, windows)
      VALUES (
        ${rowId}, 1mo2d3s, 0s, (${pairId}, 3), ${huge}, ${amount}, ${total}, [1mo2d3s]
      )
    `)

    const writeConnection = server.createConnection(keyspace)
    await writeConnection.connect()

    try {
      const before = await writeConnection.executeQuery(
        `SELECT * FROM ${keyspace}.editable WHERE id = ${rowId}`
      )
      const row = before[0].rows[0]

      // exactly what the grid holds, fed straight back as an edit
      await writeConnection.applyChanges({
        inserts: [],
        updates: [
          { table: 'editable', schema: keyspace, primaryKeys: [{ column: 'id', value: row.id }], column: 'window', value: row.window },
          { table: 'editable', schema: keyspace, primaryKeys: [{ column: 'id', value: row.id }], column: 'zero_window', value: row.zero_window },
          { table: 'editable', schema: keyspace, primaryKeys: [{ column: 'id', value: row.id }], column: 'pair', value: row.pair },
          { table: 'editable', schema: keyspace, primaryKeys: [{ column: 'id', value: row.id }], column: 'huge', value: row.huge },
          { table: 'editable', schema: keyspace, primaryKeys: [{ column: 'id', value: row.id }], column: 'amount', value: row.amount },
          { table: 'editable', schema: keyspace, primaryKeys: [{ column: 'id', value: row.id }], column: 'total', value: row.total },
          { table: 'editable', schema: keyspace, primaryKeys: [{ column: 'id', value: row.id }], column: 'windows', value: row.windows },
        ],
        deletes: [],
      })

      const after = await writeConnection.executeQuery(
        `SELECT * FROM ${keyspace}.editable WHERE id = ${rowId}`
      )
      expect(after[0].rows[0]).toEqual(row)

      // and an insert built from the same flattened shapes
      const newId = '66666666-5555-4444-3333-222222222222'
      await writeConnection.applyChanges({
        inserts: [{
          table: 'editable',
          schema: keyspace,
          data: [{
            id: newId,
            window: '1mo2d3s',
            zero_window: '0s',
            pair: [pairId, 3],
            huge,
            amount,
            total,
            windows: ['1mo2d3s'],
          }],
        }],
        updates: [],
        deletes: [],
      })

      const inserted = await writeConnection.executeQuery(
        `SELECT * FROM ${keyspace}.editable WHERE id = ${newId}`
      )
      expect(inserted[0].rows[0]).toEqual({ ...row, id: newId })
    } finally {
      await writeConnection.disconnect()
    }
  })

  it("Should report CQL type names for columns", async () => {
    const keyspace = 'type_name_test'

    await connection.executeQuery(
      `CREATE KEYSPACE IF NOT EXISTS ${keyspace} WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`
    )
    await connection.executeQuery(`
      CREATE TYPE IF NOT EXISTS ${keyspace}.name_ref (
        id UUID
      )
    `)
    await connection.executeQuery(`
      CREATE TABLE IF NOT EXISTS ${keyspace}.typed (
        name TEXT PRIMARY KEY,
        window DURATION,
        tags LIST<TEXT>,
        lookup MAP<TEXT, UUID>,
        ref FROZEN<name_ref>
      )
    `)

    const results = await connection.executeQuery(`SELECT * FROM ${keyspace}.typed`)
    const byName = {}
    results[0].fields.forEach((f) => { byName[f.name] = f.dataType })

    // text and varchar are aliases in CQL and the protocol carries both under
    // the varchar type code, so that is the name that comes back
    expect(byName.name).toBe('varchar')
    // duration used to come back as 'list', collections as 'user-defined'
    expect(byName.window).toBe('duration')
    expect(byName.tags).toBe('list<varchar>')
    expect(byName.lookup).toBe('map<varchar, uuid>')
    expect(byName.ref).toBe('name_ref')
  })
})
