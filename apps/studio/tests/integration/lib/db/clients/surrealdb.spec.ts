import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { IDbConnectionServerConfig, SurrealAuthType } from "@/lib/db/types";
import { createServer } from "@commercial/backend/lib/db/server";
import { dbtimeout } from "@tests/lib/db";
import { protocol } from "electron";
import { GenericContainer, StartedTestContainer } from "testcontainers"


describe(`SurrealDB`, () => {
  jest.setTimeout(dbtimeout);
  let container: StartedTestContainer;
  let config;
  let connection: BasicDatabaseClient<any>;

  beforeAll(async () => {
    // container = await new GenericContainer(`surrealdb/surrealdb:latest`)
    //   .withCommand(['start --log trace --user root --pass root'])
    //   .withExposedPorts(8000)
    //   .withStartupTimeout(dbtimeout)
    //   .start();

    // const host = container.getHost();
    // const port = container.getMappedPort(8000);

    config = {
      client: 'surrealdb',
      port: 8000,
      host: 'localhost',
      user: 'root',
      password: 'root',
      surrealDbOptions: {
        authType: SurrealAuthType.Root,
        namespace: 'test',
        protocol: 'ws'
      }
    }

    const server = createServer(config);
    connection = server.createConnection('test');
    await connection.connect();
  })

  afterAll(async () => {
    if (connection) {
      await connection.disconnect();
    }
    if (container) {
      await container.stop();
    }
  })

  it("Test", async () => {
    const result = await connection.selectTop('person', 100, 100, [], [], null, ['id', 'address', 'address_history', 'company_name', 'email']);

    console.log('result: ', result);
    console.log('rows: ', result.result)
  })
})
