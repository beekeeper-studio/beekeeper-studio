import { IDbConnectionServerConfig } from "@/lib/db/types";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { DBTestUtil, dbtimeout } from "../../../../lib/db";
import { runCommonTests, runReadOnlyTests } from "./all";

const TEST_VERSIONS = [
  { version: "latest", readOnly: false },
  { version: "latest", readOnly: true },
] as const;

function testWith(options: typeof TEST_VERSIONS[number]) {
  describe(`SQL Anywhere [${options.version} read-only mode? ${options.readOnly}]`, () => {
    jest.setTimeout(dbtimeout);

    let container: StartedTestContainer;
    let util: DBTestUtil;

    beforeAll(async () => {
      const timeoutDefault = 5000;
      container = await new GenericContainer(`jaschweder/sybase:${options.version}`)
        .withName(`sqlanywhere-server-readonly-${options.readOnly.toString()}`)
        .withExposedPorts(2638)
        .withStartupTimeout(dbtimeout)
        .start();
      jest.setTimeout(timeoutDefault);

      const config = {
        client: "sqlanywhere",
        host: container.getHost(),
        port: container.getMappedPort(2638),
        user: "dba",
        password: "sql",
        readOnlyMode: options.readOnly,
        sqlAnywhereOptions: {
          mode: 'server'
        }
      } as IDbConnectionServerConfig;

      util = new DBTestUtil(config, "demo", {
        dialect: "sqlanywhere",
        defaultSchema: "DBA",
      });

      await util.setupdb();
    });

    afterAll(async () => {
      await util.disconnect();
      if (container) {
        await container.stop();
      }
    });

    it("Can connect to SQL Anywhere", async () => {
      const result = await util.connection.executeQuery('SELECT 1 as test_value');
      expect(result[0].rows[0].test_value).toBe(1);
    });

    describe("Common Tests", () => {
      if (options.readOnly) {
        runReadOnlyTests(() => util);
      } else {
        runCommonTests(() => util, { dbReadOnlyMode: options.readOnly });
      }
    });
  });
}

TEST_VERSIONS.forEach(testWith);
