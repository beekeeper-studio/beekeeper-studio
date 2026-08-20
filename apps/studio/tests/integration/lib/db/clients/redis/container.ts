import { dbtimeout } from "@tests/lib/db";
import { GenericContainer, Wait } from "testcontainers";
import { ConnectionType, IDbConnectionServerConfig } from "@/lib/db/types";
import path from 'path';
import { __spreadArray } from "tslib";

type RedisFlavor = {
  /** Which client the connection should be created with */
  client: ConnectionType;
  /** Docker image, without the tag */
  image: string;
  /** Name of the CLI binary shipped in that image */
  cli: string;
};

export const REDIS: RedisFlavor = {
  client: 'redis',
  image: 'redis',
  cli: 'redis-cli',
};

export const VALKEY: RedisFlavor = {
  client: 'valkey',
  image: 'valkey/valkey',
  cli: 'valkey-cli',
};

export const RedisTestDriver = {
  container: null,
  config: null,
  flavor: REDIS as RedisFlavor,

  async start(dockerTag = 'latest', flavor: RedisFlavor = REDIS) {
    const startupTimeout = dbtimeout * 2;
    this.flavor = flavor;

    // Path to the redis data script in the dev folder
    const redisInitPath = path.resolve("./dev/docker_redis/");

    this.container = await new GenericContainer(`${flavor.image}:${dockerTag}`)
      .withBindMounts([{
        source: redisInitPath,
        target: "/docker_init",
        mode: "rw"
      }])
      .withHealthCheck({
        test: ["CMD", flavor.cli, "ping"],
        interval: 2000,
        timeout: 3000,
        retries: 10,
        startPeriod: 5000,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .withExposedPorts(6379)
      .withStartupTimeout(startupTimeout)
      .start();

    const config: IDbConnectionServerConfig = {
      client: flavor.client,
      host: this.container.getHost(),
      port: this.container.getMappedPort(6379),
      user: null,
      password: null,
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
      readOnlyMode: false
    };

    this.config = config;

    // Load test data after container is ready
    // await this.loadTestData();
  },

  async loadTestData() {
    // Execute the data.sh script inside the container
    const result = await this.container.exec(['sh', '/docker_init/data.sh'], {
      env: { REDIS_CLI: this.flavor.cli },
    });
    console.log('Test data loaded:', result);
  },

  async stop() {
    await this.container?.stop();
  }
};
