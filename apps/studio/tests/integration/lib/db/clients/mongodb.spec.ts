import { dbtimeout, rowobj } from "@tests/lib/db"
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import path from 'path';
import { getDialectData } from "@/shared/lib/dialects";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { createServer } from "@commercial/backend/lib/db/server";
import { setupDB } from "./mongodb/setupDb";
import { TableOrView } from "@/lib/db/models";


describe(`MongoDB`, () => {
  jest.setTimeout(dbtimeout);

  let container: StartedTestContainer;
  let connection: BasicDatabaseClient<any>;
  let dialectData;
  let config;

  beforeAll(async () => {
    container = await new GenericContainer('mongo:latest')
      .withName("testmongodb")
      .withEnvironment({
        "MONGO_INITDB_ROOT_USERNAME": "beekeeper",
        "MONGO_INITDB_ROOT_PASSWORD": "test",
        "MONGO_INITDB_DATABASE": "bee"
      })
      .withExposedPorts(27017)
      .withStartupTimeout(dbtimeout)
      .withHealthCheck({
        test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"],
        interval: 2000,
        timeout: 3000,
        retries: 10,
        startPeriod: 5000
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .start();

    console.log('Started container')

    const host = container.getHost();
    const port = container.getMappedPort(27017);

    const url = `mongodb://beekeeper:test@${host}:${port}/bee?authSource=admin`;

    await setupDB(url);

    dialectData = getDialectData('mongodb');
    config = {
      client: 'mongodb',
      url,
    };
    const server = createServer(config);
    connection = server.createConnection("bee");
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

  describe("Read Only Queries", () => {
    it("List tables should work", async () => {
      const tables: TableOrView[] = await connection.listTables();
      const tableNames: string[] = tables.map((t) => t.name);

      expect(tables.length).toBeGreaterThanOrEqual(3);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('addresses');
      expect(tableNames).toContain('jobs');
    });

    it("List table columns should work", async () => {
      const columns = await connection.listTableColumns("addresses");
      const columnNames = columns.map((c) => c.columnName);

      expect(columns.length).toBe(6);
      expect(columnNames).toContain('_id'); // always there
      expect(columnNames).toContain('street');
      expect(columnNames).toContain('city');
      expect(columnNames).toContain('province');
      expect(columnNames).toContain('postalCode');
      expect(columnNames).toContain('country');
    });

    it("Get database version should work", async () => {
      const version = await connection.versionString();
      expect(version).toBeDefined();
    });

    it("List indexes should work", async () => {
      const indexes = await connection.listTableIndexes("users");
      expect(indexes.find((i) => i.name.toLowerCase() === '_id_')).toBeDefined();
    });

    it("Should be able to filter columns", async () => {
      let r = await connection.selectTop("jobs", 0, 10, [], []);

      const row = rowobj(r.result)[0];
      expect(row.title).toBeDefined();
      expect(row.company).toBeDefined();
      expect(row.location).toBeDefined();
      expect(row.salary).toBeDefined();
      expect(row.type).toBeDefined();
      expect(row.posteddate).toBeDefined();

      r = await connection.selectTop("jobs", 0, 10, [], [], null, ['title']);
      expect(Object.keys(rowobj(r.result)[0])).toStrictEqual(['title'])

      r = await connection.selectTop("jobs", 0, 10, [], [], null, [ '_id', 'company' ]);
      expect(Object.keys(rowobj(r.result)[0])).toStrictEqual(['_id', 'company'])
    });

    it("Should be able to filter a table", async () => {
      let r = await connection.selectTop('jobs', 0, 10, [{ field: 'title', dir: 'DESC' }], [{ field: 'title', type: '=', value: 'Software Engineer' }]);
      let result = r.result.map((r: any) => r.title);
      expect(result).toMatchObject(['Software Engineer']);

      r = await connection.selectTop('jobs', 0, 10, [{ field: 'title', dir: 'DESC' }], [{ field: 'title', type: 'in', value: ['Software Engineer'] }]);
      result = r.result.map((r: any) => r.title);
      expect(result).toMatchObject(['Software Engineer']);

      r = await connection.selectTop("jobs", 0, 10, [{ field: 'title', dir: 'DESC' }], [{ field: 'title', type: 'in', value: ["Magician"] }]);
      result = r.result.map((r: any) => r.title);
      expect(result).toMatchObject([]);

      r = await connection.selectTop('jobs', 0, 10, [{ field: 'title', dir: 'DESC' }], [{ field: 'title', type: 'in', value: ['Software Engineer', 'DevOps Engineer'] }]);
      result = r.result.map((r: any) => r.title);
      expect(result).toMatchObject(['Software Engineer', 'DevOps Engineer']);
    })

    it("Should be able to retrieve data from a table", async () => {
      const data = await connection.selectTop('users', 0, 100, [{ field: "_id", dir: 'ASC' }], []);
      expect(data.result.length).toBe(5);
    })
  })
})
