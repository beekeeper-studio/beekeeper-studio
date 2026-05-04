import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient';
import { dbtimeout } from '../../../../../lib/db'
import { SshEnvironment } from './SshEnvironment';
import { ConnectionType } from '@/lib/db/types';

export function runCommonSshTests(dbType: ConnectionType) {
  describe(`SSH Tunnel Tests - ${dbType}`, () => {
    jest.setTimeout(dbtimeout);

    let sshEnvironment: SshEnvironment;
    let sshDatabase: BasicDatabaseClient<any>;

    beforeAll(async () => {
      sshEnvironment = new SshEnvironment(dbType);
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
    });

    it("should be able to re-establish connection after losing connection", async () => {
      const isConnectionLost = new Promise<void>((resolve) => {
        sshDatabase.connection.once("connection-lost", resolve);
      });

      await sshEnvironment.restart();

      // Run a query to trigger the connection-lost event
      await expect(sshDatabase.listTables()).rejects.toThrow();

      // Connection-lost is triggered after running a query
      await expect(isConnectionLost).resolvesWithin(1000);

      await sshDatabase.connection.disconnect();
      await sshDatabase.connection.connect();

      expect(sshDatabase.connection.isConnected).toBe(true);
      await expect(sshDatabase.executeQuery("select 1")).resolves.toBeDefined();
    });
  });
}
