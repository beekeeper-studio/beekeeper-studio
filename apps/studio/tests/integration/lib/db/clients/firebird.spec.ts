import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { IDbConnectionServerConfig } from "@/lib/db/client";
import { DBTestUtil, dbtimeout, Options } from "../../../../lib/db";
import { runCommonTests } from "./all";

describe("Firebird Tests", () => {
  let container: StartedTestContainer;
  let util: DBTestUtil;

  beforeAll(async () => {
    const timeoutDefault = 5000;
    jest.setTimeout(dbtimeout);

    container = await new GenericContainer("jacobalberty/firebird:v4.0.1")
      .withName("test_firebird")
      .withEnv("ISC_PASSWORD", "masterkey")
      .withEnv("FIREBIRD_DATABASE", "defaultdb.fdb")
      .withEnv("EnableLegacyClientAuth", "true")
      .withExposedPorts(3050)
      .withWaitStrategy(Wait.forHealthCheck())
      .withHealthCheck({
        test: `(echo "select 1 as a from rdb\$database;" | /usr/local/firebird/bin/isql -user sysdba -password masterkey /firebird/data/sakila.fdb) || exit 1`,
        interval: 2000,
        timeout: 3000,
        retries: 10,
        startPeriod: 5000,
      })
      .withStartupTimeout(dbtimeout)
      .start()

    jest.setTimeout(timeoutDefault);

    const config: IDbConnectionServerConfig = {
      client: "firebird",
      host: container.getHost(),
      port: container.getMappedPort(3050),
      user: "sysdba",
      password: "masterkey",
      osUser: null,
      ssh: null,
      sslCaFile: null,
      sslCertFile: null,
      sslKeyFile: null,
      sslRejectUnauthorized: false,
      ssl: false,
      domain: null,
      socketPath: null,
      socketPathEnabled: false,
    };
    const options: Options = {
      dialect: "firebird",
      skipPkQuote: true,
    };
    const database = "/firebird/data/defaultdb.fdb";

    util = new DBTestUtil(config, database, options);

    await util.setupdb();
  });

  afterAll(async () => {
    if (util.connection) {
      await util.connection.disconnect();
    }
    if (container) {
      await container.stop();
    }
  });

  describe("Common Tests", () => {
    runCommonTests(() => util);
  });
});

