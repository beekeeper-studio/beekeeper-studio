import { errorMessages } from '../../../../../src/lib/db/clients/utils'
import { uint8 as u } from '@tests/utils'

/**
 * @typedef {import('../../../../lib/db').DBTestUtil} DBTestUtil
 * @param {() => DBTestUtil} getUtil
 **/
export function runReadOnlyTests(getUtil) {
  describe("Read Only Queries", () => {
    beforeEach(async() => {
      await prepareTestTable(getUtil())
    })

    test("list tables should work", async() => {
      await getUtil().listTableTests()
    })
  })

  describe("Read Only Can't Write", () => {
    beforeEach(async() => {
      await prepareTestTable(getUtil())
      await prepareTestTableCompositePK(getUtil())
    })

    test("Read Only Can't delete table", async () => {
      await expect(getUtil().dropTableTests()).rejects.toThrow(errorMessages.readOnly)
    })

    test("Read Only truncate table", async () => {
      await expect(getUtil().truncateTableTests()).rejects.toThrow(errorMessages.readOnly)
    })

    test("Attempt to insert data", async () => {
      await expect(itShouldInsertGoodDataCompositePK(getUtil())).rejects.toThrow(errorMessages.readOnly)
    })

    test("Get columns for the table in read only mode", async() => {
      const table = 'test_inserts_composite_pk'
      const columns = await getUtil().connection.listTableColumns(table)
      expect(columns.length).toBeGreaterThan(0)
    })

    test("Attempt to apply all types of changes", async () => {
      await expect(itShouldApplyAllTypesOfChangesCompositePK(getUtil())).rejects.toThrow(errorMessages.readOnly)
    })
  })
}

/**
 * @param {() => DBTestUtil} getUtil
 * @param {{readOnly?: boolean, dbReadOnlyMode?: boolean}} opts?
 * */
export function runCommonTests(getUtil, opts = {}) {
  const {
    readOnly = false,
    dbReadOnlyMode = false
  } = opts

  describe("RO", () => {
    test("get database version should work", async () => {
      await getUtil().databaseVersionTest()
    })

    test("list tables should work", async() => {
      await getUtil().listTableTests()
    })

    test("list indexes should work", async () => {
      if (getUtil().data.disabledFeatures?.createIndex) return
      await getUtil().listIndexTests()
    })

    test("column tests", async() => {
      await getUtil().tableColumnsTests()
    })

    test("table view tests", async () => {
      await getUtil().tableViewTests()
    })

    describe("stream tests", () => {
      beforeAll(async () => {
        if (getUtil().dbType === 'cockroachdb') return
        await getUtil().prepareStreamTests()
      })

      test("should get all columns", async () => {
        if (getUtil().dbType === 'cockroachdb') return
        await getUtil().streamColumnsTest()
      })

      test("should count exact number of rows", async () => {
        if (getUtil().dbType === 'cockroachdb') return
        await getUtil().streamCountTest()
      })

      test("should stop/cancel streaming", async () => {
        if (getUtil().dbType === 'cockroachdb') return
        await getUtil().streamStopTest()
      })

      test("should use custom chunk size", async () => {
        if (getUtil().dbType === 'cockroachdb') return
        await getUtil().streamChunkTest()
      })

      test("should read all rows", async () => {
        if (getUtil().dbType === 'cockroachdb') return
        await getUtil().streamReadTest()
      })
    })

    test("query tests", async () => {
      if (dbReadOnlyMode) {
        await expect(getUtil().queryTests()).rejects.toThrow(errorMessages.readOnly)
      } else {
        await getUtil().queryTests()
      }
    })

    test("column filter tests", async () => {
      await getUtil().columnFilterTests()
    })

    test("table filter tests", async () => {
      await getUtil().filterTests()
    })

    test("get filtered data count", async () => {
      await testGetFilteredDataCount(getUtil())
    })

    describe("Filter Types", () => {
      test("should have correct filterTypes in supportedFeatures", async () => {
        await itShouldHaveCorrectFilterTypes(getUtil())
      })

      test("should support ilike filter for case-insensitive search", async () => {
        await itShouldSupportIlikeFilter(getUtil())
      })
    })

    test("table triggers", async () => {
      if (getUtil().data.disabledFeatures?.triggers) return
      await getUtil().triggerTests()
    })

    test("primary key tests", async () => {
      await getUtil().primaryKeyTests()
    })

    test("unique key tests", async () => {
      await getUtil().uniqueKeyTests()
    })

    test("composite key tests", async () => {
      await getUtil().compositeKeyTests()
    })

    describe("Foreign Key Tests", () => {
      test("can find incoming keys", async () => {
        await getUtil().incomingKeyTests()
      })

      test("can find incoming keys with composite primary key", async () => {
        await getUtil().incomingKeyTestsCompositePK()
      })
    })

    describe("Table Structure", () => {
      test("should fetch table properties", async () => {
        await getUtil().tablePropertiesTests()
      })

      test("should list generated columns", async () => {
        if (getUtil().data.disabledFeatures?.generatedColumns || getUtil().options.skipGeneratedColumns) return
        await getUtil().generatedColumnsTests()
      })
    })

  })

  describe("Drop Table Tests", () => {
    beforeEach(async() => {
      await prepareTestTable(getUtil())
    })

    test("Should delete table", async () => {
      if (dbReadOnlyMode) {
        await expect(getUtil().dropTableTests()).rejects.toThrow(errorMessages.readOnly)
      } else {
        await getUtil().dropTableTests()
      }
    })

    test("Bad input shouldn't delete table", async () => {
      await getUtil().badDropTableTests()
    })
  })

  describe("Create Database Tests", () => {
    test("Invalid database name", async () => {
      if (getUtil().dbType === 'oracle') {
        return
      }
      await getUtil().badCreateDatabaseTests()
    })

    test("Should create database", async () => {
      if (getUtil().options.skipCreateDatabase) {
        return
      }
      await getUtil().createDatabaseTests()
    })
  })

  describe("Truncate Table Tests", () => {
    beforeEach(async() => {
      await prepareTestTable(getUtil())
    })

    test("Should truncate table", async () => {
      // Firebird has no internal function to truncate a table
      if (getUtil().dbType === 'firebird') return
      if (dbReadOnlyMode) {
        await expect(getUtil().truncateTableTests()).rejects.toThrow(errorMessages.readOnly)
      } else {
        await getUtil().truncateTableTests()
      }
    })

    test("Bad input shouldn't allow table truncate", async () => {
      // Firebird has no internal function to truncate a table
      if (getUtil().dbType === 'firebird') return
      if (dbReadOnlyMode) {
        await expect(getUtil().badTruncateTableTests()).rejects.toThrow(errorMessages.readOnly)
      } else {
        await getUtil().badTruncateTableTests()
      }
    })
  })

  describe("Duplicate Table Tests", () => {

    beforeEach(async() => {
      // TODO There is no internal function to duplicate a table in firebird
      if (getUtil().dbType === 'firebird') return
      await prepareTestTable(getUtil())
    })

    test("Should duplicate table", async () => {
      if (getUtil().dbType === 'firebird') return
      await getUtil().duplicateTableTests()
    })

    test("Bad input shouldn't allow table duplication", async () => {
      if (getUtil().dbType === 'firebird') return
      await getUtil().badDuplicateTableTests()
    })

    test("Should print the duplicate table query", async () => {
      if (getUtil().dbType === 'firebird') return
      await getUtil().duplicateTableSqlTests()
    })
  })

  describe("Import Scripts", () => {
    beforeEach(async() => {
      await prepareImportTable(getUtil())
    })
    test("Import data", async ()=> {
      const importScriptConfig = await prepareImportTests(getUtil)
      await getUtil().importScriptsTests(importScriptConfig)
    })
    test("Rollback data", async ()=> {
      const importScriptConfig = await prepareImportTests(getUtil)
      await getUtil().importScriptRollbackTest(importScriptConfig)
    })
  })


  // press f for oracle.
  const f = readOnly ? describe.skip : describe
  // some of these tests have some funkiness going on inside the test itself where something is getting written and therefore more than likely
  // blocked and it's causing a whole string of sadness, so x will mark the spot to not test.
  const xTest = dbReadOnlyMode ? test.skip : test

  f("RW", () => {

    xTest("table view tests", async () => {
      await getUtil().tableViewTests(dbReadOnlyMode)
    })

    test("get insert query tests", async () => {
      await getUtil().getInsertQueryTests()
    })


    describe("Alter Table Tests", () => {
      beforeEach(async () => {
        await prepareTestTable(getUtil())
      })

      test('should pass add drop tests', async() => {
        if (dbReadOnlyMode) {
          await expect(getUtil().addDropTests()).rejects.toThrow(errorMessages.readOnly)
        } else {
          await getUtil().addDropTests()
        }
      })

      test("should pass alter table tests", async () => {
        if (dbReadOnlyMode) {
          await expect(getUtil().alterTableTests()).rejects.toThrow(errorMessages.readOnly)
        } else {
          await getUtil().alterTableTests()
        }
      })
      test("should alter indexes", async () => {
        if (dbReadOnlyMode) {
          await expect(getUtil().indexTests()).rejects.toThrow(errorMessages.readOnly)
        } else {
          await getUtil().indexTests()
        }
      })

      test("should rename database elements", async () => {
        if (dbReadOnlyMode) {
          await expect(getUtil().renameElementsTests()).rejects.toThrow(errorMessages.readOnly)
        } else {
          await getUtil().renameElementsTests()
        }
      })
    })


    describe("Data modification", () => {
      beforeEach(async () => {
        await prepareTestTable(getUtil())
      })

      test("should insert good data", async () => {
        if (dbReadOnlyMode) {
          await expect(itShouldInsertGoodData(getUtil())).rejects.toThrow(errorMessages.readOnly)
        } else {
          await itShouldInsertGoodData(getUtil())
        }
      })

      test("should not insert bad data", async () => {
        if (getUtil().data.disabledFeatures?.transactions || getUtil().options.skipTransactions) return
        await itShouldNotInsertBadData(getUtil())
      })

      test("should apply all types of changes", async () => {
        if (dbReadOnlyMode) {
          await expect(itShouldApplyAllTypesOfChanges(getUtil())).rejects.toThrow(errorMessages.readOnly)
        } else {
          await itShouldApplyAllTypesOfChanges(getUtil())
        }
      })

      test("should not commit on change error", async () => {
        if (getUtil().data.disabledFeatures?.transactions || getUtil().options.skipTransactions) return
        if (dbReadOnlyMode) {
          await expect(itShouldNotCommitOnChangeError(getUtil())).rejects.toThrow(errorMessages.readOnly)
        } else {
          await itShouldNotCommitOnChangeError(getUtil())
        }
      })
    })
  })

  describe("Data modification (with composite primary key)", () => {
    beforeEach(async () => {
      await prepareTestTableCompositePK(getUtil())
    })

    test("should insert good data", async () => {
      if (dbReadOnlyMode) {
        await expect(itShouldInsertGoodDataCompositePK(getUtil())).rejects.toThrow(errorMessages.readOnly)
      } else {
        await itShouldInsertGoodDataCompositePK(getUtil())
      }
    })

    test("should not insert bad data", async () => {
      if (getUtil().data.disabledFeatures?.transactions || getUtil().options.skipTransactions) return
      await itShouldNotInsertBadDataCompositePK(getUtil())
    })

    test("should apply all types of changes", async () => {
      if (dbReadOnlyMode) {
        await expect(itShouldApplyAllTypesOfChangesCompositePK(getUtil())).rejects.toThrow(errorMessages.readOnly)
      } else {
        await itShouldApplyAllTypesOfChangesCompositePK(getUtil())
      }
    })

    test("should not commit on change error", async () => {
      if (getUtil().data.disabledFeatures?.transactions || getUtil().options.skipTransactions) return
      if (dbReadOnlyMode) {
        await expect(itShouldNotCommitOnChangeErrorCompositePK(getUtil())).rejects.toThrow(errorMessages.readOnly)
      } else {
        await itShouldNotCommitOnChangeErrorCompositePK(getUtil())
      }
    })
  })

  describe("Get data modification SQL", () => {
    beforeEach(async () => {
      await prepareTestTable(getUtil())
    })

    test("Should generate scripts for all types of changes", async () => {
      await itShouldGenerateSQLForAllChanges(getUtil())
    })

    test("Should generate scripts for all types of changes with binary format", async () => {
      if (getUtil().data.disabledFeatures?.binaryColumn) return
      await itShouldGenerateSQLWithBinary(getUtil())
    })

    test("Should generate scripts for top selection", async () => {
      await getUtil().buildSelectTopQueryTests()
    })

    test("Is (not) null filter", async () => {
      await getUtil().buildIsNullTests()
    })
  })

  describe("SQLGenerator", () => {
    test("should generate scripts for creating a primary key with autoincrement", async () => {
      await getUtil().buildCreatePrimaryKeysAndAutoIncrementTests()
    })

    test("should generate filter query", async () => {
      await getUtil().getQueryForFilterTest()
    })
  })

  describe("Serialization", () => {
    test("should support binary", async () => {
      if (getUtil().data.disabledFeatures?.binaryColumn) return
      await getUtil().serializationBinary()
    })

    test("should resolve table columns", async () => {
      if (getUtil().data.disabledFeatures?.binaryColumn) return
      await getUtil().resolveTableColumns()
    })
  })

  describe("Manual Commit Mode (Transaction Management)", () => {
    beforeEach(async () => {
      await prepareManualCommitTestTable(getUtil())
    })

    afterEach(async () => {
      // Clean up any reserved connections
      try {
        await getUtil().connection.releaseConnection(999)
      } catch (e) {
        // Ignore errors if connection wasn't reserved
      }
      try {
        await getUtil().connection.releaseConnection(1000)
      } catch (e) {
        // Ignore errors if connection wasn't reserved
      }
    })

    test("should reserve and release connection", async () => {
      if (getUtil().data.disabledFeatures?.manualCommit || getUtil().options.skipTransactions) return
      await itShouldReserveAndReleaseConnection(getUtil())
    })

    test("should isolate changes within transaction until commit", async () => {
      if (getUtil().data.disabledFeatures?.manualCommit || getUtil().options.skipTransactions || getUtil().dbType === 'cockroachdb') return
      await itShouldIsolateChangesUntilCommit(getUtil())
    })

    test("should rollback uncommitted changes", async () => {
      if (getUtil().data.disabledFeatures?.manualCommit || getUtil().options.skipTransactions) return
      await itShouldRollbackUncommittedChanges(getUtil())
    })

    test("should handle multiple queries in same transaction", async () => {
      if (getUtil().data.disabledFeatures?.manualCommit || getUtil().options.skipTransactions || getUtil().dbType === 'cockroachdb') return
      await itShouldHandleMultipleQueriesInTransaction(getUtil())
    })

    test("should support concurrent transactions on different tabs", async () => {
      if (getUtil().data.disabledFeatures?.manualCommit || getUtil().options.skipTransactions || getUtil().dbType === 'cockroachdb') return
      await itShouldSupportConcurrentTransactions(getUtil())
    })
  })
}

// test functions below

const prepareTestTable = async function(util) {
  await util.knex.schema.dropTableIfExists("test_inserts")
  await util.knex.schema.createTable("test_inserts", (table) => {
    table.integer("id").primary().notNullable()
    table.specificType("first_name", "varchar(255)")
    table.specificType("last_name", "varchar(255)")
  })
}

const prepareImportTable = async function(util) {

  const tableName = (['firebird'].includes(util.dbType)) ? 'IMPORTSTUFF' : 'importstuff'

  await util.knex.schema.dropTableIfExists(tableName)
  await util.knex.schema.createTable(tableName, (t) => {
    t.string('name').primary().notNullable(),
    t.string('hat')
  })
}


export const itShouldInsertGoodData = async function(util) {

  const inserts = [
    {
      table: 'test_inserts',
      schema: util.options.defaultSchema,
      data: [{
        id: 1,
        first_name: 'Terry',
        last_name: 'Tester'
      }]
    },
    {
      table: 'test_inserts',
      schema: util.options.defaultSchema,
      data: [{
        id: 2,
        first_name: 'John',
        last_name: 'Doe'
      }]
    }
  ]
  await util.connection.applyChanges({ inserts: inserts })

  const _results = await util.knex.select().table('test_inserts')
  const results = util.dbType === 'clickhouse' ? _results[0] : _results
  expect(results.length).toBe(2)
}

export const itShouldNotInsertBadData = async function(util) {

  const inserts = [
    {
      table: 'test_inserts',
      schema: util.options.defaultSchema,
      data: [{
        id: 1,
        first_name: 'Terry',
        last_name: 'Tester'
      }]
    },
    {
      table: 'test_inserts',
      schema: util.options.defaultSchema,
      data: [{
        id: 1,
        first_name: 'John',
        last_name: 'Doe'
      }]
    }
  ]

  await expect(util.connection.applyChanges({ inserts: inserts })).rejects.toThrow()

  const results = await util.knex.select().table('test_inserts')
  expect(results.length).toBe(0)
}

export const itShouldApplyAllTypesOfChanges = async function(util) {

  const changes = {
    inserts: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 1,
          first_name: 'Tom',
          last_name: 'Tester'
        }]
      },
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 2,
          first_name: 'Jane',
          last_name: 'Doe'
        }]
      }
    ],
    updates: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        primaryKeys: [
          {
            column: 'id',
            value: 1
          }
        ],
        column: 'first_name',
        value: 'Testy'
      }
    ],
    deletes: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        primaryKeys: [{
          column: 'id', value: 2
        }],
      }
    ]
  }

  await util.connection.applyChanges(changes)

  const _results = await util.knex.select().table('test_inserts')
  const results = util.dbType === 'clickhouse' ? _results[0] : _results
  expect(results.length).toBe(1)
  const firstResult = { ...results[0] }
  // hack for cockroachdb
  firstResult.id = Number(firstResult.id)
  expect(firstResult).toStrictEqual({
    id: 1,
    first_name: 'Testy',
    last_name: 'Tester'
  })
}

export const itShouldNotCommitOnChangeError = async function(util) {

  const inserts = [
    {
      table: 'test_inserts',
      schema: util.options.defaultSchema,
      data: [{
        id: 1,
        first_name: 'Terry',
        last_name: 'Tester'
      }]
    }
  ]
  await util.connection.applyChanges({ inserts: inserts })

  const changes = {
    inserts: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 2,
          first_name: 'Tom',
          last_name: 'Tester'
        }]
      },
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 3,
          first_name: 'Jane',
          last_name: 'Doe'
        }]
      }
    ],
    updates: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        primaryKeys: [{
          column: 'id', value: 1
        }],
        column: 'id',
        value: 2
      }
    ],
    deletes: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        primaryKeys: [{
          column: 'id', value: 1
        }],
      }
    ]
  }

  await expect(util.connection.applyChanges(changes)).rejects.toThrow()

  const results = await util.knex.select().table('test_inserts')
  expect(results.length).toBe(1)
  const firstResult = { ...results[0]}
  // hack for cockroachdb
  firstResult.id = Number(firstResult.id)
  expect(firstResult).toStrictEqual({
    id: 1,
    first_name: 'Terry',
    last_name: 'Tester'
  })

}

export const testGetFilteredDataCount = async function(util) {
  // Prepare test data
  await prepareTestTable(util)

  const insertData = [
    { id: 1, first_name: 'Alice', last_name: 'Smith' },
    { id: 2, first_name: 'Bob', last_name: 'Jones' },
    { id: 3, first_name: 'Charlie', last_name: 'Smith' },
    { id: 4, first_name: 'Diana', last_name: 'Brown' },
    { id: 5, first_name: 'Eve', last_name: 'Smith' }
  ]

  const inserts = insertData.map(d => ({
    table: 'test_inserts',
    schema: util.options.defaultSchema,
    data: [d]
  }))

  await util.connection.applyChanges({ inserts })

  const tableName = 'test_inserts'
  const schema = util.options.defaultSchema

  // Test 1: Filter for last_name = 'Smith' (should return 3)
  const filter1 = await util.connection.getQueryForFilter({
    field: 'last_name',
    type: '=',
    value: 'Smith'
  })
  const count1 = await util.connection.getFilteredDataCount(tableName, schema, filter1)
  expect(count1.toString()).toBe('3')

  // Test 2: Filter for id > 3 (should return 2)
  const filter2 = await util.connection.getQueryForFilter({
    field: 'id',
    type: '>',
    value: 3
  })
  const count2 = await util.connection.getFilteredDataCount(tableName, schema, filter2)
  expect(count2.toString()).toBe('2')

  // Test 3: Filter for id = 1 (should return 1)
  const filter3 = await util.connection.getQueryForFilter({
    field: 'id',
    type: '=',
    value: 1
  })
  const count3 = await util.connection.getFilteredDataCount(tableName, schema, filter3)
  expect(count3.toString()).toBe('1')

  // Test 4: Filter that matches nothing (should return 0)
  const filter4 = await util.connection.getQueryForFilter({
    field: 'first_name',
    type: '=',
    value: 'NonExistent'
  })
  const count4 = await util.connection.getFilteredDataCount(tableName, schema, filter4)
  expect(count4.toString()).toBe('0')

  // Test 5: Invalid filter (should return empty string)
  const count5 = await util.connection.getFilteredDataCount(tableName, schema, 'invalid filter syntax!!!')
  expect(count5).toBe('')
}

// composite primary key

const prepareTestTableCompositePK = async function(util) {
  await util.knex.schema.dropTableIfExists("test_inserts_composite_pk")
  await util.knex.schema.createTable("test_inserts_composite_pk", (table) => {
    table.integer("id1").notNullable().unsigned()
    table.integer("id2").notNullable().unsigned()
    table.primary(["id1", "id2"])
    table.specificType("first_name", "varchar(255)")
    table.specificType("last_name", "varchar(255)")
  })
}


export const itShouldInsertGoodDataCompositePK = async function(util) {

  const inserts = [
    {
      table: 'test_inserts_composite_pk',
      schema: util.options.defaultSchema,
      data: [{
        id1: 1,
        id2: 1,
        first_name: 'Terry',
        last_name: 'Tester'
      }]
    },
    {
      table: 'test_inserts_composite_pk',
      schema: util.options.defaultSchema,
      data: [{
        id1: 1,
        id2: 2,
        first_name: 'John',
        last_name: 'Doe'
      }]
    },
    {
      table: 'test_inserts_composite_pk',
      schema: util.options.defaultSchema,
      data: [{
        id1: 2,
        id2: 1,
        first_name: 'Jane',
        last_name: 'Doe'
      }]
    }
  ]
  await util.connection.applyChanges({ inserts: inserts })

  const results = await util.knex.select().table('test_inserts_composite_pk')
  expect(results.length).toBe(3)
}

export const itShouldNotInsertBadDataCompositePK = async function(util) {

  const inserts = [
    {
      table: 'test_inserts_composite_pk',
      schema: util.options.defaultSchema,
      data: [{
        id1: 1,
        id2: 1,
        first_name: 'Terry',
        last_name: 'Tester'
      }]
    },
    {
      table: 'test_inserts_composite_pk',
      schema: util.options.defaultSchema,
      data: [{
        id1: 1,
        id2: 1,
        first_name: 'John',
        last_name: 'Doe'
      }]
    }
  ]

  await expect(util.connection.applyChanges({ inserts: inserts })).rejects.toThrow()

  const results = await util.knex.select().table('test_inserts_composite_pk')
  expect(results.length).toBe(0)
}

/** @param {DBTestUtil} util */
export const itShouldApplyAllTypesOfChangesCompositePK = async function(util) {

  const changes = {
    inserts: [
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        data: [{
          id1: 1,
          id2: 1,
          first_name: 'Tom',
          last_name: 'Tester'
        }]
      },
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        data: [{
          id1: 1,
          id2: 2,
          first_name: 'Jane',
          last_name: 'Doe'
        }]
      },
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        data: [{
          id1: 2,
          id2: 1,
          first_name: 'John',
          last_name: 'Doe'
        }]
      }
    ],
    updates: [
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        primaryKeys: [
          { column: 'id1', value: 1},
          { column: 'id2', value: 1}
        ],
        column: 'first_name',
        value: 'Testy'
      },
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        primaryKeys: [
          { column: 'id1', value: 2},
          { column: 'id2', value: 1}
        ],
        column: 'first_name',
        value: 'Tester'
      }
    ],
    deletes: [
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        primaryKeys: [
          { column: 'id1', value: 1},
          { column: 'id2', value: 2}
        ],
      }
    ]
  }

  await util.connection.applyChanges(changes)

  const _results = await util.knex.select().table('test_inserts_composite_pk').orderBy('id1', 'asc')
  const results = util.dbType === 'clickhouse' ? _results[0] : _results
  expect(results.length).toBe(2)

  const firstResult = { ...results[0] }
  const secondResult = { ...results[1] }

  // hack for cockroachdb
  firstResult.id1 = Number(firstResult.id1)
  firstResult.id2 = Number(firstResult.id2)
  secondResult.id1 = Number(secondResult.id1)
  secondResult.id2 = Number(secondResult.id2)

  expect(firstResult).toStrictEqual({
    id1: 1,
    id2: 1,
    first_name: 'Testy',
    last_name: 'Tester'
  })

  expect(secondResult).toStrictEqual({
    id1: 2,
    id2: 1,
    first_name: 'Tester',
    last_name: 'Doe'
  })
}

export const itShouldNotCommitOnChangeErrorCompositePK = async function(util) {

  const inserts = [
    {
      table: 'test_inserts_composite_pk',
      schema: util.options.defaultSchema,
      data: [{
        id1: 1,
        id2: 1,
        first_name: 'Terry',
        last_name: 'Tester'
      }]
    }
  ]
  await util.connection.applyChanges({ inserts: inserts })

  const changes = {
    inserts: [
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        data: [{
          id1: 1,
          id2: 2,
          first_name: 'Tom',
          last_name: 'Tester'
        }]
      },
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        data: [{
          id1: 2,
          id2: 1,
          first_name: 'Jane',
          last_name: 'Doe'
        }]
      }
    ],
    updates: [
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        primaryKeys: [
          { column: 'id1', value: 1},
          { column: 'id2', value: 1}
        ],
        column: 'id1',
        value: 2
      }
    ],
    deletes: [
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        primaryKeys: [
          { column: 'id1', value: 1 },
          { column: 'id2', value: 1 }
        ],
      }
    ]
  }

  await expect(util.connection.applyChanges(changes)).rejects.toThrow()

  const results = await util.knex.select().table('test_inserts_composite_pk')
  expect(results.length).toBe(1)

  const firstResult = { ...results[0]}

  // hack for cockroachdb
  firstResult.id1 = Number(firstResult.id1)
  firstResult.id2 = Number(firstResult.id2)

  expect(firstResult).toStrictEqual({
    id1: 1,
    id2: 1,
    first_name: 'Terry',
    last_name: 'Tester'
  })

}

export const itShouldGenerateSQLForAllChanges = async function(util) {
  const changes = {
    inserts: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 1,
          first_name: 'Tom',
          last_name: 'Tester'
        }]
      },
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 2,
          first_name: 'Jane',
          last_name: 'Doe'
        }]
      }
    ],
    updates: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        primaryKeys: [
          {
            column: 'id',
            value: 1
          }
        ],
        column: 'first_name',
        value: 'Testy'
      }
    ],
    deletes: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        primaryKeys: [{
          column: 'id', value: 2
        }],
      }
    ]
  };

  const sql = (await util.connection.applyChangesSql(changes)).toLowerCase();

  expect(sql.includes('insert'));
  expect(sql.includes('update'));
  expect(sql.includes('delete'));
  expect(sql.includes('test_inserts'));
  expect(sql.includes('jane'));
  expect(sql.includes('testy'));

}

/** @param {DBTestUtil} util */
export const itShouldGenerateSQLWithBinary = async function (util) {
  const sql = await util.connection.applyChangesSql({
    inserts: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{ id: u`deadbeef`, name: 'beef' }]
      },
    ],
    updates: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        primaryKeys: [{ column: 'id', value: u`deadbeef` }],
        column: 'name',
        value: 'beefy'
      }
    ],
    deletes: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        primaryKeys: [{ column: 'id', value: u`deadbeef` }],
      }
    ]
  })

  /** @type {Record<import('@/shared/lib/dialects/models').Dialect, string>} */
  const expectedQueries = {
    mysql:
      "insert into `test_inserts` (`id`, `name`) values (X'deadbeef', 'beef');" +
      "update `test_inserts` set `name` = 'beefy' where `id` = X'deadbeef';" +
      "delete from `test_inserts` where `id` = X'deadbeef';",
    sqlite:
      "insert into `test_inserts` (`id`, `name`) values (X'deadbeef', 'beef');" +
      "update `test_inserts` set `name` = 'beefy' where `id` = X'deadbeef';" +
      "delete from `test_inserts` where `id` = X'deadbeef';",
    sqlserver:
      "insert into [dbo].[test_inserts] ([id], [name]) values (0xdeadbeef, 'beef');" +
      "update [dbo].[test_inserts] set [name] = 'beefy' where [id] = 0xdeadbeef; select @@rowcount;" +
      "delete from [dbo].[test_inserts] where [id] = 0xdeadbeef; select @@rowcount;",
    postgresql:
      `insert into "public"."test_inserts" ("id", "name") values ('\\xdeadbeef', 'beef');` +
      `update "public"."test_inserts" set "name" = 'beefy' where "id" = '\\xdeadbeef';` +
      `delete from "public"."test_inserts" where "id" = '\\xdeadbeef';`,
    oracle:
      `insert into "BEEKEEPER"."test_inserts" ("id", "name") values (hextoraw('deadbeef'), 'beef');` +
      `update "BEEKEEPER"."test_inserts" set "name" = 'beefy' where "id" = hextoraw('deadbeef');` +
      `delete from "BEEKEEPER"."test_inserts" where "id" = hextoraw('deadbeef');`,
    firebird:
      `insert into test_inserts (id, name) values (X'deadbeef', 'beef');` +
      `update test_inserts set name = 'beefy' where id = X'deadbeef';` +
      `delete from test_inserts where id = X'deadbeef';`,
    duckdb:
      `insert into "main"."test_inserts" ("id", "name") values ('\\xDE\\xAD\\xBE\\xEF', 'beef');` +
      `update "main"."test_inserts" set "name" = 'beefy' where "id" = '\\xDE\\xAD\\xBE\\xEF';` +
      `delete from "main"."test_inserts" where "id" = '\\xDE\\xAD\\xBE\\xEF';`,
  }

  expect(util.fmt(sql)).toEqual(util.fmt(expectedQueries[util.dialect]))
}

export async function prepareImportTests (util) {
  const dialect = util().dialect
  const schema = util().defaultSchema ?? null
  let tableName = 'importstuff'

  const importScriptOptions = {
    executeOptions: { multiple: false },
    storeValues: {
      truncateTable: false
    }
  }

  let data = []
  let hatColumn = 'hat'

  if (['firebird', 'oracle'].includes(dialect)) {
    tableName = 'IMPORTSTUFF'
    data = [
      {
        'NAME': 'biff',
        'HAT': 'beret'
      },
      {
        'NAME': 'spud',
        'HAT': 'fez'
      },
      {
        'NAME': 'chuck',
        'HAT': 'barretina'
      },
      {
        'NAME': 'lou',
        'HAT': 'tricorne'
      }
    ]
    hatColumn = 'HAT'
  } else {
    data = [
      {
        'name': 'biff',
        'hat': 'beret'
      },
      {
        'name': 'spud',
        'hat': 'fez'
      },
      {
        'name': 'chuck',
        'hat': 'barretina'
      },
      {
        'name': 'lou',
        'hat': 'tricorne'
      }
    ]
  }
  const table = {
    schema,
    name: tableName,
    entityType: 'table'
  }
  const formattedData = data.map(d => ({
    table: tableName,
    schema,
    data: [d]
  }))

  return {
    tableName, table, formattedData, importScriptOptions, hatColumn
  }
}

/** @param {DBTestUtil} util */
export const itShouldHaveCorrectFilterTypes = async function(util) {
  const features = await util.connection.supportedFeatures()

  // All databases should have 'standard' filterTypes
  expect(features.filterTypes).toContain('standard')
  expect(Array.isArray(features.filterTypes)).toBe(true)
  expect(features.filterTypes.length).toBeGreaterThan(0)

  // PostgreSQL-based databases should have 'ilike'
  const ilikeSupported = ['postgresql', 'psql', 'cockroachdb', 'redshift']
  if (ilikeSupported.includes(util.dbType) || ilikeSupported.includes(util.dialect)) {
    expect(features.filterTypes).toContain('ilike')
    expect(features.filterTypes).toEqual(['standard', 'ilike'])
  } else {
    // Other databases should NOT have 'ilike'
    expect(features.filterTypes).not.toContain('ilike')
    expect(features.filterTypes).toEqual(['standard'])
  }
}

/** @param {DBTestUtil} util */
export const itShouldSupportIlikeFilter = async function(util) {
  const features = await util.connection.supportedFeatures()
  const ilikeSupported = features.filterTypes.includes('ilike')

  if (!ilikeSupported) return

  const tableName = 'filter_type_test'
  await util.knex.schema.dropTableIfExists(tableName)
  await util.knex.schema.createTable(tableName, (table) => {
    table.integer("id").primary()
    table.string("name")
    table.string("description")
  })

  await util.knex(tableName).insert([
    { id: 1, name: 'Apple', description: 'A RED fruit' },
    { id: 2, name: 'BANANA', description: 'A yellow fruit' },
    { id: 3, name: 'Cherry', description: 'A red BERRY' },
    { id: 4, name: 'orange', description: 'An ORANGE citrus' }
  ])


  if (ilikeSupported) {
    const ilikeFilters = [
      { field: 'name', type: 'ilike', value: 'apple' }
    ]

    const ilikeResult = await util.connection.selectTop(
      tableName, 0, 100, [], ilikeFilters, util.options.defaultSchema
    )

    expect(ilikeResult.result.length).toBe(1)
    expect(ilikeResult.result[0].name).toBe('Apple')

    const wildcardFilters = [
      { field: 'description', type: 'ilike', value: '%fruit%' }
    ]

    const wildcardResult = await util.connection.selectTop(
      tableName, 0, 100, [], wildcardFilters, util.options.defaultSchema
    )

    expect(wildcardResult.result.length).toBe(2)

    const notIlikeFilters = [
      { field: 'description', type: 'not ilike', value: '%red%' }
    ]

    const notIlikeResult = await util.connection.selectTop(
      tableName, 0, 100, [], notIlikeFilters, util.options.defaultSchema
    )

    expect(notIlikeResult.result.length).toBe(2)
    const ids = notIlikeResult.result.map(r => r.id.toString()).sort()
    expect(ids).toEqual(['2', '4'])

    const likeLowerFilters = [
      { field: 'name', type: 'like', value: 'apple' }
    ]
    const likeResult = await util.connection.selectTop(
      tableName, 0, 100, [], likeLowerFilters, util.options.defaultSchema
    )
    expect(likeResult.result.length).toBe(0)
  }

  await util.knex.schema.dropTableIfExists(tableName)
}
// Manual Commit Tests

/**
 * Helper function to get the properly formatted table name for manual commit tests
 * @param {string} dbType - The database type
 * @returns {string} - The formatted table name
 */
function getManualCommitTableName(dbType) {
  switch (dbType) {
    case 'sqlserver':
      return '[dbo].[manual_commit_test]'
    case 'oracle':
      return 'BEEKEEPER."manual_commit_test"'
    default:
      return 'manual_commit_test'
  }
}

/**
 * Helper function to wrap column names for specific database types
 * @param {string} dbType - The database type
 * @param {string} columnName - The column name to wrap
 * @returns {string} - The wrapped column name
 */
function wrapColumn(dbType, columnName) {
  if (dbType === 'oracle') {
    return `"${columnName}"`
  }
  return columnName
}

/**
 * Helper function to build INSERT query for manual commit tests
 * @param {string} dbType - The database type
 * @param {number} id - The ID value
 * @param {string} name - The name value
 * @returns {string} - The INSERT query
 */
function buildInsertQuery(dbType, id, name) {
  const tableName = getManualCommitTableName(dbType)
  const idCol = wrapColumn(dbType, 'id')
  const nameCol = wrapColumn(dbType, 'name')
  return `INSERT INTO ${tableName} (${idCol}, ${nameCol}) VALUES (${id}, '${name}')`
}

/**
 * Helper function to build SELECT query for manual commit tests
 * @param {string} dbType - The database type
 * @param {string} [orderBy] - Optional ORDER BY clause
 * @returns {string} - The SELECT query
 */
function buildSelectQuery(dbType, orderBy = '') {
  const tableName = getManualCommitTableName(dbType)
  const orderColumn = orderBy ? wrapColumn(dbType, orderBy) : ''
  const orderClause = orderBy ? ` ORDER BY ${orderColumn}` : ''
  return `SELECT * FROM ${tableName}${orderClause}`
}

/**
 * Helper function to build UPDATE query for manual commit tests
 * @param {string} dbType - The database type
 * @param {number} id - The ID value to match
 * @param {string} name - The new name value
 * @returns {string} - The UPDATE query
 */
function buildUpdateQuery(dbType, id, name) {
  const tableName = getManualCommitTableName(dbType)
  const idCol = wrapColumn(dbType, 'id')
  const nameCol = wrapColumn(dbType, 'name')
  return `UPDATE ${tableName} SET ${nameCol} = '${name}' WHERE ${idCol} = ${id}`
}

const prepareManualCommitTestTable = async function(util) {
  await util.knex.schema.dropTableIfExists("manual_commit_test")
  await util.knex.schema.createTable("manual_commit_test", (table) => {
    table.integer("id").primary().notNullable()
    table.specificType("name", "varchar(255)")
  })
}

export const itShouldReserveAndReleaseConnection = async function(util) {
  const tabId = 999

  // Reserve a connection
  await util.connection.reserveConnection(tabId)

  // Verify connection is reserved by attempting to reserve again (should throw)
  await expect(util.connection.reserveConnection(tabId)).rejects.toThrow()

  // Release the connection
  await util.connection.releaseConnection(tabId)

  // Should be able to reserve again after release
  await util.connection.reserveConnection(tabId)
  await util.connection.releaseConnection(tabId)
}

export const itShouldIsolateChangesUntilCommit = async function(util) {
  const tabId = 999

  // Reserve connection and start transaction
  await util.connection.reserveConnection(tabId)
  await util.connection.startTransaction(tabId)

  // Insert data within the transaction
  const insertQuery = buildInsertQuery(util.dbType, 1, 'Test User')

  const query = await util.connection.query(insertQuery, tabId)
  await query.execute();

  // Query from outside the transaction (simulate user checking from another tab) - should NOT see the data
  const selectQuery = buildSelectQuery(util.dbType)

  const queryBeforeCommit = await util.connection.query(selectQuery)
  const resultsBeforeCommit = await queryBeforeCommit.execute()
  expect(resultsBeforeCommit[0].rows.length).toBe(0)

  // Commit the transaction
  await util.connection.commitTransaction(tabId)

  // Now query from outside - should see the data
  const queryAfterCommit = await util.connection.query(selectQuery)
  const resultsAfterCommit = await queryAfterCommit.execute()
  expect(resultsAfterCommit[0].rows.length).toBe(1)

  // Clean up
  await util.connection.releaseConnection(tabId)
}

export const itShouldRollbackUncommittedChanges = async function(util) {
  const tabId = 999

  // Reserve connection and start transaction
  await util.connection.reserveConnection(tabId)
  await util.connection.startTransaction(tabId)

  // Insert data within the transaction
  const insertQuery = buildInsertQuery(util.dbType, 2, 'Rollback Test')

  const query = await util.connection.query(insertQuery, tabId)
  await query.execute();

  // Rollback the transaction
  await util.connection.rollbackTransaction(tabId)

  // Query from outside - should NOT see the rolled back data
  const selectQuery = buildSelectQuery(util.dbType)

  const queryAfterRollback = await util.connection.query(selectQuery)
  const results = await queryAfterRollback.execute()
  expect(results[0].rows.length).toBe(0)

  // Clean up
  await util.connection.releaseConnection(tabId)
}

export const itShouldHandleMultipleQueriesInTransaction = async function(util) {
  const tabId = 999

  // Reserve connection and start transaction
  await util.connection.reserveConnection(tabId)
  await util.connection.startTransaction(tabId)

  // Execute multiple queries in the same transaction
  const insertQuery1 = buildInsertQuery(util.dbType, 3, 'User 1')
  const insertQuery2 = buildInsertQuery(util.dbType, 4, 'User 2')
  const updateQuery = buildUpdateQuery(util.dbType, 3, 'Updated User')

  const query1 = await util.connection.query(insertQuery1, tabId)
  await query1.execute()
  const query2 = await util.connection.query(insertQuery2, tabId)
  await query2.execute()
  const query3 = await util.connection.query(updateQuery, tabId)
  await query3.execute()

  // Verify from outside transaction - should see nothing
  const selectQuery = buildSelectQuery(util.dbType, 'id')

  const queryBeforeCommit = await util.connection.query(selectQuery)
  const resultsBeforeCommit = await queryBeforeCommit.execute()
  expect(resultsBeforeCommit[0].rows.length).toBe(0)

  // Commit the transaction
  await util.connection.commitTransaction(tabId)

  // Now verify all changes are committed
  const queryAfterCommit = await util.connection.query(selectQuery)
  const resultsAfterCommit = await queryAfterCommit.execute()
  expect(resultsAfterCommit[0].rows.length).toBe(2)

  // Clean up
  await util.connection.releaseConnection(tabId)
}

export const itShouldSupportConcurrentTransactions = async function(util) {
  const tabId1 = 999
  const tabId2 = 1000

  // Reserve two separate connections for two different tabs
  await util.connection.reserveConnection(tabId1)
  await util.connection.reserveConnection(tabId2)

  // Start transactions on both
  await util.connection.startTransaction(tabId1)
  await util.connection.startTransaction(tabId2)

  // Insert different data in each transaction
  const insertQuery1 = buildInsertQuery(util.dbType, 5, 'Tab 1 User')
  const insertQuery2 = buildInsertQuery(util.dbType, 6, 'Tab 2 User')

  const query1 = await util.connection.query(insertQuery1, tabId1)
  await query1.execute()
  const query2 = await util.connection.query(insertQuery2, tabId2)
  await query2.execute()

  // Commit only the first transaction
  await util.connection.commitTransaction(tabId1)

  // Check that only tab1's data is visible outside transactions
  const selectQuery = buildSelectQuery(util.dbType, 'id')

  const queryAfterFirstCommit = await util.connection.query(selectQuery)
  const resultsAfterFirstCommit = await queryAfterFirstCommit.execute()
  expect(resultsAfterFirstCommit[0].rows.length).toBe(1)

  // Rollback the second transaction
  await util.connection.rollbackTransaction(tabId2)

  // Verify only tab1's data remains
  const queryFinal = await util.connection.query(selectQuery)
  const finalResults = await queryFinal.execute()
  expect(finalResults[0].rows.length).toBe(1)

  // Clean up
  await util.connection.releaseConnection(tabId1)
  await util.connection.releaseConnection(tabId2)
}
