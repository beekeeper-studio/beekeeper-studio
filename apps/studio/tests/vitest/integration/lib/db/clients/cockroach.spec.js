import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { DockerComposeEnvironment } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '@tests/lib/db'
import { runCommonTests } from './all';
import { runSshTests } from './ssh/commonSshTests';
import path from 'path'
import CsvImporter from '@commercial/backend/lib/import/formats/csv'

describe("CockroachDB Tests", () => {
  vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout })

  let container;
  let util
  let environment
  // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

  beforeAll(async () => {
    environment = await new DockerComposeEnvironment("tests/docker", "cockroachdb.yml").up()
    container = environment.getContainer('test_cockroachdb')
    const config = {
      client: 'cockroachdb',
      host: container.getHost(),
      port: container.getMappedPort(26257),
      user: 'root',
    }
    util = new DBTestUtil(config, "defaultdb", {dialect: 'postgresql', version: '7.2', skipPkQuote: true, defaultSchema: 'public'})
    await util.setupdb();

    await util.knex.raw(`
      CREATE TABLE public.test_indexes (
        first_name text NOT NULL,
        last_name text NOT NULL,
        data jsonb NOT NULL DEFAULT '{"a": {"b": ["foo", "bar"]}}'::jsonb
      );

      CREATE INDEX single_column ON test_indexes (first_name);
      CREATE INDEX multi_column ON test_indexes (first_name, last_name);
      CREATE INDEX single_expression ON test_indexes (lower(first_name));
      CREATE INDEX multi_expression ON test_indexes (lower(first_name), lower(last_name));
      CREATE INDEX expression_with_comma ON test_indexes ((lower(first_name) || ', ' || lower(last_name)));
      CREATE INDEX expression_with_double_quote ON test_indexes (('"' || first_name));
      CREATE INDEX expression_with_jsonb_operator ON test_indexes ((data #>> '{a,b,1}'));
    `);

  })

  afterAll(async () => {
    await util.disconnect()
    if (container) {
      await container.stop()
    }
    if (environment) {
      await environment.stop()
    }
  })

  describe("Common Tests", () => {
    runCommonTests(() => util)
  })

  it("should be able to list basic indexes", async () => {
    const indexes = await util.connection.listTableIndexes('test_indexes')
    // cockroach adds a pkey index
    expect(indexes.length).toBe(8)
    expect(indexes.find((idx) => idx.name === 'single_column').columns.length).toBe(1)
    expect(indexes.find((idx) => idx.name === 'multi_column').columns.length).toBe(2)
    expect(indexes.find((idx) => idx.name === 'single_expression').columns.length).toBe(1)
    expect(indexes.find((idx) => idx.name === 'multi_expression').columns.length).toBe(2)
    expect(indexes.find((idx) => idx.name === 'expression_with_comma').columns.length).toBe(1)
    expect(indexes.find((idx) => idx.name === 'expression_with_double_quote').columns.length).toBe(1)
    expect(indexes.find((idx) => idx.name === 'expression_with_jsonb_operator').columns.length).toBe(1)
  })

  describe("Import into a table created from the import file", () => {
    it("should create the table and import the rows", async () => {
      const table = { schema: 'public', name: 'new_people', entityType: 'table' }
      const columns = ['id', 'name', 'city', 'age', 'joined']
      const importer = new CsvImporter(path.join(__dirname, '../../../../../fixtures/new_people.csv'), {
        columnDelimeter: ',', quoteCharacter: '"', escapeCharacter: '"', newlineCharacter: '',
        useHeaders: true, trimWhitespaces: true, nullableValues: [],
        importMap: columns.map((c) => ({ fileColumn: c, tableColumn: c })),
        createNewTable: true, truncateTable: false, runAsUpsert: false
      }, util.connection, table)

      await importer.importFile('CREATE TABLE public.new_people (id int PRIMARY KEY, name text, city text, age int, joined date)')

      const rows = await util.knex('new_people').select('name', 'city').orderBy('id')
      expect(rows.map((r) => r.city)).toEqual(['Paris', 'Berlin', 'Rome, IT', 'Oslo'])
    })

    it("should not leave the table behind when the import fails", async () => {
      const table = { schema: 'public', name: 'import_aborted_table', entityType: 'table' }
      const importScriptOptions = {
        executeOptions: { multiple: false },
        storeValues: { createNewTable: true, truncateTable: false, runAsUpsert: false }
      }
      // inserts like the CSV reader, then aborts
      const read = async (_options, executeOptions) => {
        const lineOptions = { ...importScriptOptions, executeOptions: { multiple: true, ...executeOptions } }
        const importSQL = await util.connection.getImportSQL([{ table: table.name, schema: table.schema, data: [{ id: 1, hat: 'fez' }] }], table.name, table.schema, false, lineOptions)
        await util.connection.importLineReadCommand(table, importSQL, lineOptions)
        return { aborted: true, error: 'forced abort' }
      }
      const createTableSql = 'CREATE TABLE public.import_aborted_table (id int PRIMARY KEY, hat text)'
      await expect(util.connection.importFile(table, importScriptOptions, read, createTableSql)).rejects.toThrow('forced abort')

      expect(await util.knex.schema.hasTable('import_aborted_table')).toBe(false)
    })
  })
})

runSshTests("cockroachdb");
