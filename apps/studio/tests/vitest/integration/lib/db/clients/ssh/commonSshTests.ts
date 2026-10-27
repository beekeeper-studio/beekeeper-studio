import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { dbtimeout } from "@tests/lib/db";
import { SshEnvironment } from "./SshEnvironment";
import { ConnectionType, IDbConnectionServerConfig } from "@/lib/db/types";
import { createServer } from "@commercial/backend/lib/db/server";

export function runSshTests(dbType: ConnectionType) {
  describe(`SSH Tunnel Tests - ${dbType}`, () => {
    vi.setConfig({ testTimeout: dbtimeout, hookTimeout: dbtimeout });

    let sshEnv: SshEnvironment;
    let client: BasicDatabaseClient<any>;

    beforeAll(async () => {
      sshEnv = new SshEnvironment(dbType);
      await sshEnv.start();
    });

    afterAll(async () => {
      await sshEnv?.stop();
    });

    beforeEach(async () => {
      const config = {
        client: dbType,
        host: sshEnv.dbConfig.networkAlias,
        port: sshEnv.dbConfig.port,
        user: sshEnv.dbConfig.user,
        password: sshEnv.dbConfig.password,
        ssh: {
          host: sshEnv.getSshHost(),
          port: sshEnv.getSshPort(),
          user: "beekeeper",
          password: "password",
        },
        trustServerCertificate: true,
      } as IDbConnectionServerConfig;
      client = createServer(config).createConnection(sshEnv.dbConfig.database);
      await client.connect();
    });

    afterEach(async () => {
      await client?.disconnect();
    });

    it("should work", async () => {
      await expect(client.executeQuery("SELECT 1")).resolves.toBeDefined();
    });

    it("should detect connection lost", async () => {
      const fn = vi.fn();

      client.connection.on("connection-lost", fn);

      await sshEnv.restart();

      // Must run a query to trigger the connection-lost event
      await expect(client.listTables()).rejects.toThrow();

      // Yield to the event loop to allow the "connection-lost" event to fire
      await new Promise((resolve) => setTimeout(resolve));

      expect(fn).toHaveBeenCalled();
    });

    it("should be able to re-establish connection after losing connection", async () => {
      const isConnectionLost = new Promise<void>((resolve) => {
        client.connection.once("connection-lost", resolve);
      });

      await sshEnv.restart();

      // Run a query to trigger the connection-lost event
      await expect(client.listTables()).rejects.toThrow();

      // Connection-lost is triggered after running a query
      await expect(isConnectionLost).resolvesWithin(1000);

      await client.connection.disconnect();
      await client.connection.connect();

      expect(client.connection.isConnected).toBe(true);
      await expect(client.executeQuery("select 1")).resolves.toBeDefined();
    });

    // Unlike a direct connection, the pool can't heal on its own once the tunnel is gone.
    it("should fail fast without hanging until reconnected", async () => {
      await sshEnv.restart();

      const first = client.executeQuery("select 1");
      await expect(first.catch(() => { })).resolvesWithin(5000);
      await expect(first).rejects.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const second = client.executeQuery("select 1");
      await expect(second.catch(() => { })).resolvesWithin(5000);
      await expect(second).rejects.toThrow();

      await client.connection.disconnect();
      await client.connection.connect();

      await expect(client.executeQuery("select 1")).resolves.toBeDefined();
    });
  });
}
