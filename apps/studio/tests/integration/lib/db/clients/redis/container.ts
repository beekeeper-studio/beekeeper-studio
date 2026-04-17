import { dbtimeout } from "@tests/lib/db";
import { GenericContainer, Wait } from "testcontainers";
import { IDbConnectionServerConfig } from "@/lib/db/types";
import path from 'path';
import { __spreadArray } from "tslib";

export const RedisTestDriver = {
  container: null,
  config: null,

  async start(dockerTag = 'latest') {
    const startupTimeout = dbtimeout * 2;

    // Path to the redis data script in the dev folder
    const redisInitPath = path.resolve("./dev/docker_redis/");

    this.container = await new GenericContainer(`redis:${dockerTag}`)
      .withBindMounts([{
        source: redisInitPath,
        target: "/docker_init",
        mode: "rw"
      }])
      .withHealthCheck({
        test: ["CMD", "redis-cli", "ping"],
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
      client: 'redis',
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
    const result = await this.container.exec(['sh', '/docker_init/data.sh']);
    console.log('Redis test data loaded:', result);
  },

  async stop() {
    await this.container?.stop();
  }
};
