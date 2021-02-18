export const itShouldInsertGoodData = async function(util) {
  await util.knex.schema.createTable("test_inserts", (table) => {
    table.integer("id").primary()
    table.specificType("firstName", "varchar(255)")
    table.specificType("lastName", "varchar(255)")
  })

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

export async function itShouldNotInsertBadData(util) {
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

  await expect(util.connection.applyChanges({ inserts: inserts })).rejects.toThrow()

  const results = await util.knex.select().table('test_inserts')
  expect(results.length).toBe(2)
}

export async function itShouldApplyAllTypesOfChanges(util) {
  const changes = {
    inserts: [
      {
        table: 'test_inserts',
        data: {
          id: 3,
          firstName: 'Tom',
          lastName: 'Tester'
        }
      },
      {
        table: 'test_inserts',
        data: {
          id: 4,
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
  expect(results.length).toBe(3)
  expect(results).toContainEqual({
    id: 1,
    firstName: 'Testy',
    lastName: 'Tester'
  })
}

export async function itShouldNotCommitOnChangeError(util) {

}