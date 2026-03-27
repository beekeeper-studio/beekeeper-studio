import { DockerComposeEnvironment } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all';
import { SshEnvironment } from './ssh/SshEnvironment';

describe("CockroachDB Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let util
  let environment
  // const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

  beforeAll(async () => {
    const timeoutDefault = 5000
    environment = await new DockerComposeEnvironment("tests/docker", "cockroachdb.yml").up()
    container = environment.getContainer('test_cockroachdb')
    jest.setTimeout(timeoutDefault)
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

  describe("SSH Tunnel Tests", () => {
    let sshEnvironment;
    let sshDatabase;

    beforeAll(async () => {
      sshEnvironment = new SshEnvironment('cockroachdb');
      await sshEnvironment.start();
    });

    afterAll(async () => {
      await sshEnvironment?.stop();
    });

    beforeEach(async () => {
      sshDatabase = await sshEnvironment.connect();
    });

    afterEach(async () => {
      await sshDatabase?.disconnect();
    });

    it("should work", async () => {
      await expect(sshDatabase.executeQuery("SELECT 1")).resolves.toBeDefined();
    });

    it("should detect connection lost", async () => {
      const fn = jest.fn();

      sshDatabase.connection.on("connection-lost", fn);

      await sshEnvironment.restart();

      // Must run a query to trigger the connection-lost event
      await expect(sshDatabase.listTables()).rejects.toThrow();

      // Yield to the event loop to allow the "connection-lost" event to fire
      await new Promise((resolve) => setTimeout(resolve));

      expect(fn).toBeCalled();
      expect(sshDatabase.connection.isConnected).toBe(false);
    });

    it("should be able to re-establish connection after losing connection", async () => {
      const isConnectionLost = new Promise((resolve) => {
        sshDatabase.connection.once("connection-lost", resolve);
      });

      await sshEnvironment.restart();

      // Run a query to trigger the connection-lost event
      await expect(sshDatabase.listTables()).rejects.toThrow();

      // Connection-lost is triggered after running a query
      await expect(isConnectionLost).resolvesWithin(1000);

      await sshDatabase.connection.connect();
      expect(sshDatabase.connection.isConnected).toBe(true);
      await expect(sshDatabase.executeQuery("select 1")).resolves.toBeDefined();
    });
  })
})
