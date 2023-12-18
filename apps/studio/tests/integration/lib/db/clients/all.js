import { transformObj } from '../../../../lib/db'

export function runCommonTests(getUtil) {

  test("get database version should work", async() => {
    await getUtil().databaseVersionTest()
  })

  test("list tables should work", async() => {
    await getUtil().listTableTests()
  })

  test("column tests", async() => {
    await getUtil().tableColumnsTests()
  })

  test("table view tests", async () => {
    await getUtil().tableViewTests()
  })

  test("stream tests", async () => {
    // TODO please recheck if firebird support this
    if (getUtil().dbType.match(/cockroachdb|firebird/)) {
      return
    }
    await getUtil().streamTests()
  })

  test("query tests", async () => {
    if (getUtil().dbType === 'sqlite') {
      return
    }
    await getUtil().queryTests()
  })

  test("get insert query tests", async () => {
    await getUtil().getInsertQueryTests()
  })

  test("column filter tests", async () => {
    await getUtil().columnFilterTests()
  })

  test("table filter tests", async () => {
    await getUtil().filterTests()
  })

  test("table triggers", async () => {
    await getUtil().triggerTests()
  })

  test("primary key tests", async () => {
    await getUtil().primaryKeyTests()
  })

  describe("Alter Table Tests", () => {
    beforeEach(async() => {
      await prepareTestTable(getUtil())
    })

    test("should pass alter table tests", async () => {
      await getUtil().alterTableTests()
    })
    test("should alter indexes", async () => {
      // TODO fix firebird
      if (getUtil().dbType === 'firebird') return
      await getUtil().indexTests()
    })
  })

  describe("Drop Table Tests", () => {
    beforeEach(async() => {
      await prepareTestTable(getUtil())
    })

    test("Should delete table", async () => {
      await getUtil().dropTableTests()
    })

    test("Bad input shouldn't delete table", async () => {
      await getUtil().badDropTableTests()
    })
  })

  describe("Create Database Tests", () => {
    test("Invalid database name", async () => {
      await getUtil().badCreateDatabaseTests()
    })

    test("Should create database", async () => {
      // FIXME: Firebird database is a new file
      if (getUtil().dbType === 'firebird') return
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
      await getUtil().truncateTableTests()
    })

    test("Bad input shouldn't allow table truncate", async () => {
      await getUtil().badTruncateTableTests()
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

  describe("Table Structure", () => {
    test("should fetch table properties", async() => {
      await getUtil().tablePropertiesTests()
    })
  })

  describe("Data modification", () => {
    beforeEach(async () => {
      await prepareTestTable(getUtil())
    })

    test("should insert good data", async () => {
      await itShouldInsertGoodData(getUtil())
    })

    test("should not insert bad data", async () => {
      await itShouldNotInsertBadData(getUtil())
    })

    test("should apply all types of changes", async () => {
      await itShouldApplyAllTypesOfChanges(getUtil())
    })

    test("should not commit on change error", async () => {
      // FIXME: broken in firebird
      if (getUtil().dbType === 'firebird') return
      await itShouldNotCommitOnChangeError(getUtil())
    })
  })

  describe("Data modification (with composite primary key)", () => {
    beforeEach(async () => {
      await prepareTestTableCompositePK(getUtil())
    })

    test("should insert good data", async () => {
      await itShouldInsertGoodDataCompositePK(getUtil())
    })

    test("should not insert bad data", async () => {
      await itShouldNotInsertBadDataCompositePK(getUtil())
    })

    test("should apply all types of changes", async () => {
      await itShouldApplyAllTypesOfChangesCompositePK(getUtil())
    })

    test("should not commit on change error", async () => {
      // FIXME: broken in firebird
      if (getUtil().dbType === 'firebird') return
      await itShouldNotCommitOnChangeErrorCompositePK(getUtil())
    })
  })

  describe("Get data modification SQL", () => {
    beforeEach(async () => {
      await prepareTestTable(getUtil())
    })

    test("Should generate scripts for all types of changes", () => {
      itShouldGenerateSQLForAllChanges(getUtil())
    })

    test("Should generate scripts for top selection", async () => {
      await getUtil().buildSelectTopQueryTests()
    })
  })

}

// test functions below

const prepareTestTable = async function(util) {
  await util.knex.schema.dropTableIfExists("test_inserts")
  await util.knex.schema.createTable("test_inserts", (table) => {
    table.integer("id").primary().notNullable()
    table.specificType("firstName", "varchar(255)")
    table.specificType("lastName", "varchar(255)")
  })
}


export const itShouldInsertGoodData = async function(util) {

  const inserts = [
    {
      table: 'test_inserts',
      schema: util.options.defaultSchema,
      data: [{
        id: 1,
        firstName: 'Terry',
        lastName: 'Tester'
      }]
    },
    {
      table: 'test_inserts',
      schema: util.options.defaultSchema,
      data: [{
        id: 2,
        firstName: 'John',
        lastName: 'Doe'
      }]
    }
  ]
  await util.connection.applyChanges({ inserts: inserts })

  const results = await util.knex.select().table('test_inserts')
  expect(results.length).toBe(2)
}

export const itShouldNotInsertBadData = async function(util) {

  const inserts = [
    {
      table: 'test_inserts',
      schema: util.options.defaultSchema,
      data: [{
        id: 1,
        firstName: 'Terry',
        lastName: 'Tester'
      }]
    },
    {
      table: 'test_inserts',
      schema: util.options.defaultSchema,
      data: [{
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      }]
    }
  ]

  await expect(util.connection.applyChanges({ inserts: inserts })).rejects.toThrow()

  const results = await util.knex.select().table('test_inserts')

  if (util.dbType === 'firebird') {
    // In firebird, the data is inserted separately
    expect(results.length).toBe(1)
  } else {
    expect(results.length).toBe(0)
  }
}

export const itShouldApplyAllTypesOfChanges = async function(util) {

  const changes = {
    inserts: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 1,
          firstName: 'Tom',
          lastName: 'Tester'
        }]
      },
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 2,
          firstName: 'Jane',
          lastName: 'Doe'
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
        column: 'firstName',
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

  const results = await util.knex.select().table('test_inserts')
  expect(results.length).toBe(1)
  const firstResult = { ...results[0] }
  // hack for cockroachdb
  if (util.dbType !== 'firebird') {
    firstResult.id = Number(firstResult.id)
  }
  expect(firstResult).toStrictEqual(transformObj(util, {
    id: 1,
    firstName: 'Testy',
    lastName: 'Tester'
  }))
}

export const itShouldNotCommitOnChangeError = async function(util) {

  const inserts = [
    {
      table: 'test_inserts',
      schema: util.options.defaultSchema,
      data: [{
        id: 1,
        firstName: 'Terry',
        lastName: 'Tester'
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
          firstName: 'Tom',
          lastName: 'Tester'
        }]
      },
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 3,
          firstName: 'Jane',
          lastName: 'Doe'
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
  if (util.dbType !== 'firebird') {
    firstResult.id = Number(firstResult.id)
  }
  expect(firstResult).toStrictEqual(transformObj(util, {
    id: 1,
    firstName: 'Terry',
    lastName: 'Tester'
  }))

}

// composite primary key

const prepareTestTableCompositePK = async function(util) {
  await util.knex.schema.dropTableIfExists("test_inserts_composite_pk")
  await util.knex.schema.createTable("test_inserts_composite_pk", (table) => {
    table.integer("id1").notNullable().unsigned()
    table.integer("id2").notNullable().unsigned()
    table.primary(["id1", "id2"])
    table.specificType("firstName", "varchar(255)")
    table.specificType("lastName", "varchar(255)")
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
        firstName: 'Terry',
        lastName: 'Tester'
      }]
    },
    {
      table: 'test_inserts_composite_pk',
      schema: util.options.defaultSchema,
      data: [{
        id1: 1,
        id2: 2,
        firstName: 'John',
        lastName: 'Doe'
      }]
    },
    {
      table: 'test_inserts_composite_pk',
      schema: util.options.defaultSchema,
      data: [{
        id1: 2,
        id2: 1,
        firstName: 'Jane',
        lastName: 'Doe'
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
        firstName: 'Terry',
        lastName: 'Tester'
      }]
    },
    {
      table: 'test_inserts_composite_pk',
      schema: util.options.defaultSchema,
      data: [{
        id1: 1,
        id2: 1,
        firstName: 'John',
        lastName: 'Doe'
      }]
    }
  ]

  await expect(util.connection.applyChanges({ inserts: inserts })).rejects.toThrow()

  const results = await util.knex.select().table('test_inserts_composite_pk')
  if (util.dbType === 'firebird') {
    // In firebird, the data is inserted separately
    expect(results.length).toBe(1)
  } else {
    expect(results.length).toBe(0)
  }
}

export const itShouldApplyAllTypesOfChangesCompositePK = async function(util) {

  const changes = {
    inserts: [
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        data: [{
          id1: 1,
          id2: 1,
          firstName: 'Tom',
          lastName: 'Tester'
        }]
      },
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        data: [{
          id1: 1,
          id2: 2,
          firstName: 'Jane',
          lastName: 'Doe'
        }]
      },
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        data: [{
          id1: 2,
          id2: 1,
          firstName: 'John',
          lastName: 'Doe'
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
        column: 'firstName',
        value: 'Testy'
      },
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        primaryKeys: [
          { column: 'id1', value: 2},
          { column: 'id2', value: 1}
        ],
        column: 'firstName',
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

  const results = await util.knex.select().table('test_inserts_composite_pk')
  expect(results.length).toBe(2)

  const firstResult = { ...results[0] }
  const secondResult = { ...results[1] }

  // hack for cockroachdb
  if (util.dbType !== 'firebird') {
    firstResult.id1 = Number(firstResult.id1)
    firstResult.id2 = Number(firstResult.id2)
    secondResult.id1 = Number(secondResult.id1)
    secondResult.id2 = Number(secondResult.id2)
  }

  expect(firstResult).toStrictEqual(transformObj(util, {
    id1: 1,
    id2: 1,
    firstName: 'Testy',
    lastName: 'Tester'
  }))

  expect(secondResult).toStrictEqual(transformObj(util, {
    id1: 2,
    id2: 1,
    firstName: 'Tester',
    lastName: 'Doe'
  }))
}

export const itShouldNotCommitOnChangeErrorCompositePK = async function(util) {

  const inserts = [
    {
      table: 'test_inserts_composite_pk',
      schema: util.options.defaultSchema,
      data: [{
        id1: 1,
        id2: 1,
        firstName: 'Terry',
        lastName: 'Tester'
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
          firstName: 'Tom',
          lastName: 'Tester'
        }]
      },
      {
        table: 'test_inserts_composite_pk',
        schema: util.options.defaultSchema,
        data: [{
          id1: 2,
          id2: 1,
          firstName: 'Jane',
          lastName: 'Doe'
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
  if (util.dbType !== 'firebird') {
    firstResult.id1 = Number(firstResult.id1)
    firstResult.id2 = Number(firstResult.id2)
  }

  expect(firstResult).toStrictEqual(transformObj(util, {
    id1: 1,
    id2: 1,
    firstName: 'Terry',
    lastName: 'Tester'
  }))

}

export const itShouldGenerateSQLForAllChanges = function(util) {
  const changes = {
    inserts: [
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 1,
          firstName: 'Tom',
          lastName: 'Tester'
        }]
      },
      {
        table: 'test_inserts',
        schema: util.options.defaultSchema,
        data: [{
          id: 2,
          firstName: 'Jane',
          lastName: 'Doe'
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
        column: 'firstName',
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

  const sql = util.connection.applyChangesSql(changes).toLowerCase();

  expect(sql.includes('insert'));
  expect(sql.includes('update'));
  expect(sql.includes('delete'));
  expect(sql.includes('test_inserts'));
  expect(sql.includes('jane'));
  expect(sql.includes('testy'));
}
