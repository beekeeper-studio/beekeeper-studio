import { DockerComposeEnvironment } from "testcontainers";
import { IDbConnectionServerConfig } from "@/lib/db/client";
import { StartedGenericContainer } from "testcontainers/dist/generic-container/started-generic-container";
import { DBTestUtil, dbtimeout, Options } from "../../../../lib/db";
import { runCommonTests } from "./all";

describe("Firebird Tests", () => {
  let container: StartedGenericContainer;
  let util: DBTestUtil;

  beforeAll(async () => {
    const timeoutDefault = 5000;
    jest.setTimeout(dbtimeout);

    const environment = await new DockerComposeEnvironment(
      "tests/docker",
      "firebird.yml"
    ).up();
    container = environment.getContainer("test_firebird");

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

