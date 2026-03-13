import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient';
import { DB_CONFIGS, SshEnvironment } from '@tests/integration/lib/db/clients/ssh/SshEnvironment';
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection';
import { ConnectionType } from '@/lib/db/types';

describe("SSH Tunnel Tests", () => {
  jest.setTimeout(dbtimeout)

  beforeAll(async () => {
    await TestOrmConnection.connect()
  })

  afterAll(async () => {
    await TestOrmConnection.disconnect()
  })

  for (const type of Object.keys(DB_CONFIGS) as ConnectionType[]) {
    describe(type, () => {
      let environment: SshEnvironment;
      let database: BasicDatabaseClient<any>;

      beforeAll(async () => {
        environment = new SshEnvironment(type);
        await environment.start();
      });

      afterAll(async () => {
        await environment?.stop();
      });

      beforeEach(async () => {
        database = await environment.connect();
      });

      afterEach(async () => {
        await database?.disconnect()
      });

      it("should work", async () => {
        const query = type === "cassandra"
          ? "SELECT release_version FROM system.local"
          : "SELECT 1";
        await expect(database.executeQuery(query)).resolves.toBeDefined();
      })

      if (type === "cassandra") {
        // Skip the next tests for Cassandra
        return;
      }

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

        // Connection-lost is triggered after running a query
        await expect(isConnectionLost).resolvesWithin(1000);

        await database.connection.connect();
        expect(database.connection.isConnected).toBe(true);
        await expect(database.executeQuery("select 1")).resolves.toBeDefined();
      })
    });
  }
})
