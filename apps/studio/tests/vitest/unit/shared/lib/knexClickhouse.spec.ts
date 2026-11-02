import knexlib from 'knex'
import { ClickhouseKnexClient } from '@shared/lib/knex-clickhouse'

describe('ClickhouseKnexClient escaping', () => {
  const knex = knexlib({ client: ClickhouseKnexClient })

  it('escapes each backslash in a string binding exactly once', () => {
    const sql = knex('bs_test').where('id', 1).update({ v: 'C:\\temp\\new' }).toQuery()
    expect(sql).toContain(`'C:\\\\temp\\\\new'`)
    expect(sql).not.toContain('\\\\\\')
  })

  it('escapes quotes and backslashes in array bindings once', () => {
    const sql = knex.raw('select ?', [['a\\b', "it's"]]).toQuery()
    expect(sql).toBe(`select ['a\\\\b','it''s']`)
  })
})
