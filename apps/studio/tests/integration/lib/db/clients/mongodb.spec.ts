import { dbtimeout } from "@tests/lib/db"
import {  MongoDBContainer, StartedTestContainer, Wait } from "testcontainers";
import path from 'path';
import { getDialectData } from "@/shared/lib/dialects";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { createServer } from "@commercial/backend/lib/db/server";


describe(`MongoDB`, () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let connection: BasicDatabaseClient<any>;
  let dialectData;
  let config;

  beforeAll(async () => {
    const username = "beekeeper";
    const password = "test";
    const db = "test";
    const localDir = path.resolve('./mongodb');
    container = await new MongoDBContainer()
      .withName("testmongodb")
      .withEnvironment({
        "MONGO_INITDB_ROOT_USERNAME": username,
        "MONGO_INITDB_ROOT_PASSWORD": password,
        "MONGO_INITDB_DATABASE": db
      })
      .withExposedPorts(27017)
      .withBindMounts([{
        source: localDir, 
        target: '/docker-entrypoint-initdb.d', 
        mode: 'ro'
      }])
      .withStartupTimeout(dbtimeout)
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(27017);

    const url = `mongodb://${username}:${password}@${host}:${port}`;
    dialectData = getDialectData('mongodb');
    config = {
      client: 'mongodb',
      url,
    };
    const server = createServer(config);
    connection = server.createConnection(db);
    await connection.connect();
  })

  afterAll(async () => {
    if (container) {
      await container.stop();
    }
  })

  it("Should be able to retrieve data from a table", async () => {
    const data = await connection.selectTop('users', 0, 100, [{ field: "_id", dir: 'ASC' }], []);
    console.log('data: ', data);
  })
})
