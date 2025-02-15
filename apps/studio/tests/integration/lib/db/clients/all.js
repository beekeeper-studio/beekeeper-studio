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
        if (getUtil().dbType === 'cockroachdb' || getUtil().dbType === 'clickhouse') return
        await getUtil().prepareStreamTests()
      })

      test("should get all columns", async () => {
        if (getUtil().dbType === 'cockroachdb' || getUtil().dbType === 'clickhouse') return
        await getUtil().streamColumnsTest()
      })

      test("should count exact number of rows", async () => {
        if (getUtil().dbType === 'cockroachdb' || getUtil().dbType === 'clickhouse') return
        await getUtil().streamCountTest()
      })

      test("should stop/cancel streaming", async () => {
        if (getUtil().dbType === 'cockroachdb' || getUtil().dbType === 'clickhouse') return
        await getUtil().streamStopTest()
      })

      test("should use custom chunk size", async () => {
        if (getUtil().dbType === 'cockroachdb' || getUtil().dbType === 'clickhouse') return
        await getUtil().streamChunkTest()
      })

      test("should read all rows", async () => {
        if (getUtil().dbType === 'cockroachdb' || getUtil().dbType === 'clickhouse') return
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


    test("table triggers", async () => {
      if (getUtil().data.disabledFeatures?.triggers) return
      await getUtil().triggerTests()
    })

    test("primary key tests", async () => {
      await getUtil().primaryKeyTests()
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
