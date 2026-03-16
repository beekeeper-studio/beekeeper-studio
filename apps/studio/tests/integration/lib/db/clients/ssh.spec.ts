import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient';
import { DatabaseConnectionLostError } from '@/lib/db/clients/DatabaseConnection';
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
        await expect(database.executeQuery("SELECT 1")).resolves.toBeDefined();
      })

      it("should detect connection lost", async () => {
        await environment.restart();

        // Must run a query to trigger the connection-lost error
        await expect(database.listTables()).rejects.toThrow(DatabaseConnectionLostError);

        expect(database.connection.isConnected).toBe(false);
      });

      it("should be able to re-establish connection after losing connection", async () => {
        await environment.restart();

        // Run a query to trigger the connection-lost error
        await expect(database.listTables()).rejects.toThrow(DatabaseConnectionLostError);

        // Run again to re-establish connection (or run database.connection.connect())
        await expect(database.listTables()).resolves.toBeDefined();
      })
    });
  }
})
