const prepareTestTable = async function(util) {
  await util.knex.schema.dropTableIfExists("test_inserts")
  await util.knex.schema.createTable("test_inserts", (table) => {
    table.integer("id").primary()
    table.specificType("firstName", "varchar(255)")
    table.specificType("lastName", "varchar(255)")
  })
}

export const itShouldInsertGoodData = async function(util) {
  await prepareTestTable(util)

  const inserts = [
    {
      table: 'test_inserts',
      data: {
        id: 1,
        firstName: 'Terry',
        lastName: 'Tester'
      }
    },
    {
      table: 'test_inserts',
      data: {
        id: 2,
        firstName: 'John',
        lastName: 'Doe'
      }
    }
  ]
  await util.connection.applyChanges({ inserts: inserts })

  const results = await util.knex.select().table('test_inserts')
  expect(results.length).toBe(2)
}

export const itShouldNotInsertBadData = async function(util) {
  await prepareTestTable(util)

  const inserts = [
    {
      table: 'test_inserts',
      data: {
        id: 1,
        firstName: 'Terry',
        lastName: 'Tester'
      }
    },
    {
      table: 'test_inserts',
      data: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      }
    }
  ]

  await expect(util.connection.applyChanges({ inserts: inserts })).rejects.toThrow()

  const results = await util.knex.select().table('test_inserts')
  expect(results.length).toBe(0)
}

export const itShouldApplyAllTypesOfChanges = async function(util) {
  await prepareTestTable(util)

  const changes = {
    inserts: [
      {
        table: 'test_inserts',
        data: {
          id: 1,
          firstName: 'Tom',
          lastName: 'Tester'
        }
      },
      {
        table: 'test_inserts',
        data: {
          id: 2,
          firstName: 'Jane',
          lastName: 'Doe'
        }
      }
    ],
    updates: [
      {
        table: 'test_inserts',
        pkColumn: 'id',
        primaryKey: 1,
        column: 'firstName',
        value: 'Testy'
      }
    ],
    deletes: [
      {
        table: 'test_inserts',
        pkColumn: 'id',
        primaryKey: 2,
      }
    ]
  }

  await util.connection.applyChanges(changes)

  const results = await util.knex.select().table('test_inserts')
  expect(results.length).toBe(1)
  expect(results).toContainEqual({
    id: 1,
    firstName: 'Testy',
    lastName: 'Tester'
  })
}

export const itShouldNotCommitOnChangeError = async function(util) {
  await prepareTestTable(util)

  const inserts = [
    {
      table: 'test_inserts',
      data: {
        id: 1,
        firstName: 'Terry',
        lastName: 'Tester'
      }
    }
  ]
  await util.connection.applyChanges({ inserts: inserts })

  const changes = {
    inserts: [
      {
        table: 'test_inserts',
        data: {
          id: 2,
          firstName: 'Tom',
          lastName: 'Tester'
        }
      },
      {
        table: 'test_inserts',
        data: {
          id: 3,
          firstName: 'Jane',
          lastName: 'Doe'
        }
      }
    ],
    updates: [
      {
        table: 'test_inserts',
        pkColumn: 'id',
        primaryKey: 1,
        column: 'id',
        value: 2
      }
    ],
    deletes: [
      {
        table: 'test_inserts',
        pkColumn: 'id',
        primaryKey: 1,
      }
    ]
  }

  await expect(util.connection.applyChanges(changes)).rejects.toThrow()

  const results = await util.knex.select().table('test_inserts')
  expect(results.length).toBe(1)
  expect(results).toContainEqual({
    id: 1,
    firstName: 'Terry',
    lastName: 'Tester'
  })

}