import { describe, vi, beforeAll, afterAll } from "vitest"
import { DockerComposeEnvironment, Wait } from 'testcontainers'
import { DBTestUtil } from '@tests/lib/db'
import { runCommonTests } from './all'
import { runBksTypeTests } from "./bksType";

const greengageTimeout = 600_000

const GREENGAGE_VERSIONS = ['6', '7'] as const
type GreengageVersion = typeof GREENGAGE_VERSIONS[number]

const VERSION_CONFIG: Record<GreengageVersion, { composeFile: string; serviceName: string; port: number }> = {
  '6': { composeFile: 'greengage6.yml', serviceName: 'test_greengage6', port: 6000 },
  '7': { composeFile: 'greengage7.yml', serviceName: 'test_greengage7', port: 7000 },
}

const pgHbaCmd = [
  'bash', '-c',
  "TRUST='host all all 0.0.0.0/0 trust'; " +
  "for hba in $(find / -path '*/gpdemo/datadirs/*' -name pg_hba.conf 2>/dev/null); do " +
  '[ -f "$hba" ] && { echo "$TRUST"; cat "$hba"; } > "${hba}.new" && mv "${hba}.new" "$hba" && chown gpadmin:gpadmin "$hba"; ' +
  "done; " +
  "su - gpadmin -c 'source /usr/local/greengage-db-devel/greengage_path.sh 2>/dev/null; cd /gpdb_src/gpAux/gpdemo 2>/dev/null && source gpdemo-env.sh 2>/dev/null && gpstop -u'",
]

function testWith(version: GreengageVersion) {
  const { composeFile, serviceName, port } = VERSION_CONFIG[version]

  describe(`Greengage client v${version} (PostgreSQL-compatible)`, () => {
    vi.setConfig({ testTimeout: greengageTimeout, hookTimeout: greengageTimeout })

    let environment: Awaited<ReturnType<DockerComposeEnvironment['up']>>
    let util: DBTestUtil

    beforeAll(async () => {
      environment = await new DockerComposeEnvironment('tests/docker', composeFile)
        .withWaitStrategy(
          serviceName,
          Wait.forLogMessage(/Signalling all postmaster processes to reload/, 1)
        )
        .withStartupTimeout(greengageTimeout)
        .up()

      const container = environment.getContainer(serviceName)
      // Apply pg_hba.conf trust rule for external connections (Docker host IP)
      await container.exec(pgHbaCmd)

      const host = container.getHost()
      const mappedPort = container.getMappedPort(port)

      const config = {
        client: 'greengage' as const,
        host,
        port: mappedPort,
        user: 'gpadmin',
        password: '',
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
      }

      util = new DBTestUtil(config, 'postgres', {
        dialect: 'greengage',
        defaultSchema: 'public',
        knexConnectionOptions: { host, port: mappedPort },
        // Greengage v6 (Greenplum 6 / PostgreSQL 9.4) does not support GENERATED columns (added in PG 12)
        ...(version === '6' && { skipGeneratedColumns: true }),
      })
      await util.setupdb()
    })

    afterAll(async () => {
      await util.disconnect()
      if (environment) {
        await environment.stop()
      }
    })

    describe('Common tests (postgres syntax)', () => {
      runCommonTests(() => util)
    })

    describe("BksField tests", () => {
      beforeAll(async () => {
        await util.knex.schema.createTable("bks_types", (table) => {
          table.specificType("smallint_col", "SMALLINT");
          table.specificType("integer_col", "INTEGER");
          table.specificType("bigint_col", "BIGINT");
          table.specificType("numeric_col", "NUMERIC(10,2)");
          table.specificType("real_col", "REAL");
          table.specificType("double_col", "DOUBLE PRECISION");
          table.specificType("money_col", "MONEY");
          table.specificType("char_col", "CHAR(10)");
          table.specificType("varchar_col", "VARCHAR(255)");
          table.specificType("text_col", "TEXT");
          table.specificType("uuid_col", "UUID");
          table.specificType("json_col", "JSON");
          table.specificType("jsonb_col", "JSONB");
          table.specificType("xml_col", "XML");
          table.specificType("inet_col", "INET");
          table.specificType("cidr_col", "CIDR");
          table.specificType("macaddr_col", "MACADDR");
          table.specificType("bit_col", "BIT(8)");
          table.specificType("date_col", "DATE");
          table.specificType("time_col", "TIME");
          table.specificType("timetz_col", "TIMETZ");
          table.specificType("timestamp_col", "TIMESTAMP");
          table.specificType("timestamptz_col", "TIMESTAMPTZ");
          table.specificType("interval_col", "INTERVAL");
          table.specificType("boolean_col", "BOOLEAN");
          table.specificType("bytea_col", "BYTEA");
        });
      });

      afterAll(async () => {
        await util.knex.schema.dropTable("bks_types");
      });

      runBksTypeTests({
        connection: () => util.connection,
        table: "bks_types",
        expectedResults: {
          BINARY: ["bytea_col"],
          STRING: [
            "char_col",
            "varchar_col",
            "text_col",
            "uuid_col",
            "json_col",
            "jsonb_col",
            "xml_col",
            "inet_col",
            "cidr_col",
            "macaddr_col",
            "bit_col",
          ],
          NUMBER: [
            "smallint_col",
            "integer_col",
            "bigint_col",
            "numeric_col",
            "real_col",
            "double_col",
            "money_col",
          ],
          DATETIME: [
            "date_col",
            "time_col",
            "timetz_col",
            "timestamp_col",
            "timestamptz_col",
            "interval_col",
          ],
          BOOLEAN: ["boolean_col"],
          OBJECTID: [],
          SURREALID: [],
          UNKNOWN: [],
        },
      });
    });
  })
}

GREENGAGE_VERSIONS.forEach((v) => testWith(v))
