import { buildInsertQuery } from '@/lib/db/clients/utils'
import knexlib from 'knex'

const knex = knexlib({ client: 'sqlite3', useNullAsDefault: true })

describe('buildInsertQuery', () => {
  describe('columns with DEFAULT values and null user input', () => {
    it('omits a column from INSERT when it has hasDefault and the value is null', () => {
      const insert = {
        table: 'orders',
        schema: null,
        data: [{ id: 1, name: 'Widget', created_at: null }],
      }
      const columns = [
        { columnName: 'id', dataType: 'integer', hasDefault: false },
        { columnName: 'name', dataType: 'varchar' },
        { columnName: 'created_at', dataType: 'timestamp', hasDefault: true },
      ]

      const sql = buildInsertQuery(knex, insert, { columns })

      expect(sql).toContain('`id`')
      expect(sql).toContain('`name`')
      // created_at has a DEFAULT and value is null — must NOT appear in the INSERT
      expect(sql).not.toContain('created_at')
    })

    it('omits a column from INSERT when it has hasDefault and the value is undefined', () => {
      const insert = {
        table: 'events',
        schema: null,
        data: [{ id: 5, title: 'Meeting', occurred_at: undefined }],
      }
      const columns = [
        { columnName: 'id', dataType: 'integer' },
        { columnName: 'title', dataType: 'varchar' },
        { columnName: 'occurred_at', dataType: 'timestamp', hasDefault: true },
      ]

      const sql = buildInsertQuery(knex, insert, { columns })

      expect(sql).not.toContain('occurred_at')
    })

    it('keeps a DEFAULT column in INSERT when the user provides an explicit non-null value', () => {
      const insert = {
        table: 'orders',
        schema: null,
        data: [{ id: 2, name: 'Gadget', created_at: '2024-01-15 10:00:00' }],
      }
      const columns = [
        { columnName: 'id', dataType: 'integer' },
        { columnName: 'name', dataType: 'varchar' },
        { columnName: 'created_at', dataType: 'timestamp', hasDefault: true },
      ]

      const sql = buildInsertQuery(knex, insert, { columns })

      expect(sql).toContain('`created_at`')
      expect(sql).toContain('2024-01-15 10:00:00')
    })

    it('keeps null values for columns without a DEFAULT (allows explicit NULL insert)', () => {
      const insert = {
        table: 'users',
        schema: null,
        data: [{ id: 3, email: 'foo@bar.com', middle_name: null }],
      }
      const columns = [
        { columnName: 'id', dataType: 'integer' },
        { columnName: 'email', dataType: 'varchar' },
        { columnName: 'middle_name', dataType: 'varchar', hasDefault: false },
      ]

      const sql = buildInsertQuery(knex, insert, { columns })

      // middle_name has no default, so the explicit NULL should be preserved
      expect(sql).toContain('`middle_name`')
    })

    it('omits multiple DEFAULT columns when all are left empty', () => {
      const insert = {
        table: 'records',
        schema: null,
        data: [{ id: 10, label: 'Test', created_at: null, updated_at: null }],
      }
      const columns = [
        { columnName: 'id', dataType: 'integer' },
        { columnName: 'label', dataType: 'varchar' },
        { columnName: 'created_at', dataType: 'timestamp', hasDefault: true },
        { columnName: 'updated_at', dataType: 'timestamp', hasDefault: true },
      ]

      const sql = buildInsertQuery(knex, insert, { columns })

      expect(sql).toContain('`id`')
      expect(sql).toContain('`label`')
      expect(sql).not.toContain('created_at')
      expect(sql).not.toContain('updated_at')
    })

    it('still works when no column metadata is provided (no regression)', () => {
      const insert = {
        table: 'things',
        schema: null,
        data: [{ id: 1, name: null }],
      }

      const sql = buildInsertQuery(knex, insert)

      // Without column metadata there is no hasDefault info — null is passed through as before
      expect(sql).toContain('`id`')
      expect(sql).toContain('`name`')
    })
  })
})
