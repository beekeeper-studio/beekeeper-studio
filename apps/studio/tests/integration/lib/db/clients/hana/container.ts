import { GenericContainer, Wait, StartedTestContainer } from "testcontainers";
import { IDbConnectionServerConfig, HanaAuthType } from "@/lib/db/types";
import hana from "@sap/hana-client";

// HANA express boots slowly: ~5 minutes on a warm CI runner, plus the
// (~4GB) image pull on a cold one.
export const HANA_STARTUP_TIMEOUT = 1000 * 60 * 15;

const MASTER_PASSWORD = "HXEHana1";

// Instance 90: 39013 is the SYSTEMDB SQL port, 39041 the HXE tenant SQL port.
// Tests connect straight to the tenant's mapped port -- going through the
// SYSTEMDB port with databaseName set makes the nameserver redirect the
// client to the tenant's unmapped container-internal port.
const TENANT_PORT = 39041;

export const HanaTestDriver = {
  container: null as StartedTestContainer | null,
  config: null as IDbConnectionServerConfig | null,

  async start(): Promise<void> {
    const build = (withUlimits: boolean) => {
      let container = new GenericContainer("saplabs/hanaexpress:2.00.088.00.20251110.1")
        .withCopyContentToContainer([{
          // world-readable so hxeadm (uid 12000) inside the container can read it
          content: JSON.stringify({ master_password: MASTER_PASSWORD }),
          target: "/hana/mounts/passwords.json",
          mode: 0o644,
        }])
        .withCommand([
          "--passwords-url", "file:///hana/mounts/passwords.json",
          "--agree-to-sap-license",
        ])
        .withExposedPorts(TENANT_PORT)
        .withWaitStrategy(Wait.forLogMessage(/Startup finished/))
        .withStartupTimeout(HANA_STARTUP_TIMEOUT);
      if (withUlimits) {
        container = container.withUlimits({ nofile: { soft: 1048576, hard: 1048576 } });
      }
      return container;
    };

    try {
      this.container = await build(true).start();
    } catch (err) {
      // restricted docker hosts (rootless/sandboxed daemons) can't raise
      // rlimits -- retry with the daemon's defaults
      if (!/rlimit/i.test(err?.message ?? '')) throw err;
      this.container = await build(false).start();
    }

    this.config = {
      client: 'hana',
      host: this.container.getHost(),
      port: this.container.getMappedPort(TENANT_PORT),
      user: 'SYSTEM',
      password: MASTER_PASSWORD,
      osUser: 'foo',
      ssh: null,
      sslCaFile: null,
      sslCertFile: null,
      sslKeyFile: null,
      sslRejectUnauthorized: false,
      ssl: false,
      domain: null,
      socketPath: null,
      socketPathEnabled: false,
      readOnlyMode: false,
      hanaOptions: {
        authMethod: HanaAuthType.Password,
      },
    };
  },

  // Seeds through a raw driver connection, one statement per exec --
  // SQLScript bodies contain semicolons that statement splitting would break.
  async seed(statements: string[]): Promise<void> {
    const conn = hana.createConnection();
    await new Promise<void>((resolve, reject) => {
      conn.connect({
        host: this.config.host,
        port: this.config.port,
        uid: this.config.user,
        pwd: this.config.password,
        encrypt: 'false',
      }, (err) => err ? reject(err) : resolve());
    });

    try {
      for (const statement of statements) {
        await new Promise<void>((resolve, reject) => {
          conn.exec(statement, (err) => err ? reject(new Error(`Seed statement failed: ${statement}\n${err}`)) : resolve());
        });
      }
    } finally {
      await new Promise<void>((resolve) => conn.disconnect(() => resolve()));
    }
  },

  async stop(): Promise<void> {
    await this.container?.stop();
  },
};
