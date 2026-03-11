import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient';
import { DB_CONFIGS, SshEnvironment } from '@tests/integration/lib/db/clients/ssh/SshEnvironment';
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection';
import { ConnectionType } from '@/lib/db/types';

describe("SSH Tunnel Tests", () => {
  jest.setTimeout(dbtimeout)

  let environment: SshEnvironment;

  beforeAll(async () => {
    await TestOrmConnection.connect()

    const timeoutDefault = 5000
    environment = new SshEnvironment();
    await environment.start();

    jest.setTimeout(timeoutDefault)
  })

  for (const type of Object.keys(DB_CONFIGS) as ConnectionType[]) {
    describe(type, () => {
      let database: BasicDatabaseClient<any>;

      beforeEach(async () => {
        database = await environment.connect(type);
      });

      afterEach(async () => {
        await database?.disconnect()
      });

      it("should work", async () => {
        await expect(database.executeQuery('select 1')).resolves.toBeDefined();
      })

      it("should detect connection lost", async () => {
        const fn = jest.fn();

        database.connection.on("connection-lost", fn);

        await environment.restart();

        // Must run a query to trigger the connection-lost event
        await expect(database.listTables()).rejects.toThrow();

        // Yield to the event loop to allow the "connection-lost" event to fire
        await new Promise((resolve) => setTimeout(resolve));

        expect(fn).toBeCalled();
        expect(database.connection.isConnected).toBe(false);
      });

      it("should be able to re-establish connection after losing connection", async () => {
        const isConnectionLost = new Promise<void>((resolve) => {
          database.connection.once("connection-lost", resolve);
        });

        await environment.restart();

        // Run a query to trigger the connection-lost event
        await expect(database.listTables()).rejects.toThrow();

        await isConnectionLost;
        await database.connection.connect();
        expect(database.connection.isConnected).toBe(true);
        await expect(database.executeQuery("select 1")).resolves.toBeDefined();
      })
    });
  }

  afterAll(async () => {
    if (environment) {
      await environment.stop()
    }
    await TestOrmConnection.disconnect()
  })
})
