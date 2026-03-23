import { DockerComposeEnvironment, Wait } from 'testcontainers'
import ConnectionProvider from '@commercial/backend/lib/connection-provider';
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection';
import { DB_CONFIGS, SshEnvironment } from '@tests/integration/lib/db/clients/ssh/SshEnvironment';



describe("SSH Tunnel Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let connection
  let database
  let environment

  beforeAll(async () => {
    await TestOrmConnection.connect()

    const timeoutDefault = 5000
    environment = await new DockerComposeEnvironment("tests/docker", "ssh.yml")
      .withWaitStrategy('test_ssh_postgres', Wait.forLogMessage("database system is ready to accept connections", 2))
      .withWaitStrategy('test_ssh', Wait.forListeningPorts())
      .up()

    container = environment.getContainer('test_ssh')

    const db = environment.getContainer('test_ssh_postgres')

    jest.setTimeout(timeoutDefault)

    const quickConfig = {
      host: db.getHost(),
      port: db.getMappedPort(5432),
      username: 'postgres',
      password: 'example',
      connectionType: 'postgresql'
    }

    // NB: If this fails it's due to ipv4 vs ipv6 mixup.
    // as of Node 17+ DNS defaults to v6 instead of v4.
    let host = container.getHost()
    const config = {
      connectionType: 'postgresql',
      host: 'postgres',
      port: 5432,
      username: 'postgres',
      password: 'example',
      sshEnabled: true,
      sshMode: 'userpass',
      sshHost: container.getHost(),
      sshPort: container.getMappedPort(2222),
      sshUsername: 'beekeeper',
      sshPassword: 'password'
    }

    const qc = ConnectionProvider.for(quickConfig)
    const qdb = qc.createConnection('integration_test')
    await qdb.connect()
    const query = await qdb.query('select 1');
    await query.execute()
    await qdb.disconnect();

    console.log("Starting SSH test with config", config)
    connection = ConnectionProvider.for(config)
    database = connection.createConnection('integration_test')
    await database.connect()
  })

  describe("Can SSH and run a query", () => {
    it("should work", async () => {
      const query = await database.query('select 1');
      await query.execute()
    } )
  })

  afterAll(async () => {
    if (database) {
      await database.disconnect()
    }
    if (container) {
      await container.stop()
    }
    if (environment) {
      await environment.stop()
    }
    await TestOrmConnection.disconnect()
  })

  for (const type of Object.keys(DB_CONFIGS)) {
    describe(type, () => {
      let sshEnvironment;
      let sshDatabase;

      beforeAll(async () => {
        sshEnvironment = new SshEnvironment(type);
        await sshEnvironment.start();
      });

      afterAll(async () => {
        await sshEnvironment?.stop();
      });

      beforeEach(async () => {
        sshDatabase = await sshEnvironment.connect();
      });

      afterEach(async () => {
        await sshDatabase?.disconnect()
      });

      it("should work", async () => {
        await expect(sshDatabase.executeQuery("SELECT 1")).resolves.toBeDefined();
      })

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
      })
    });
  }
})
