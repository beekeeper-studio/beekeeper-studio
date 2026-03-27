import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'
import { SshEnvironment } from './ssh/SshEnvironment'

describe("MariaDB Tests", () => {
  jest.setTimeout(dbtimeout)

  let container;
  let util

  beforeAll(async () => {
    const timeoutDefault = 5000
    container = await new GenericContainer("mariadb")
      .withName("maria")
      .withEnvironment({
        "MYSQL_ROOT_PASSWORD": "test",
        "MYSQL_DATABASE": "test"
      })
      .withExposedPorts(3306)
      .withStartupTimeout(dbtimeout)
      .start()
    jest.setTimeout(timeoutDefault)
    const config = {
      client: 'mariadb',
      host: container.getHost(),
      port: container.getMappedPort(3306),
      user: 'root',
      password: 'test'
    }
    util = new DBTestUtil(config, "test", { dialect: 'mysql'})
    await util.setupdb()
  })

  afterAll(async () => {
    await util.disconnect()
    if (container) {
      await container.stop()
    }
  })

  describe("Common Tests", () => {
    runCommonTests(() => util)
  })

  // Regression test: https://github.com/beekeeper-studio/beekeeper-studio/issues/2640 
  it("Should handle columns with binary collation", async () => {
    await util.knex.raw(`
      CREATE TABLE binary_collation (
        id int(10) unsigned NOT NULL AUTO_INCREMENT,
        uuid char(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        name varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uuid (uuid)
      ) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
    `);

    await util.knex.raw(`
      INSERT INTO binary_collation (id, uuid, name) VALUES
        (3, 'HIVsRcGKkPFtW', 'lorem'),
        (1, 'Qwsogvtv82FCd', 'ipsum'),
        (5, 'YnFzw1gLeOb1', 'dolor'),
        (2, 'razxDUgYGNAdQ', 'sit'),
        (4, 'yhjMzLPhuIDl', 'amet');
    `);

    const expectedBksFields = [
      { name: 'id', bksType: 'UNKNOWN' },
      { name: 'uuid', bksType: 'UNKNOWN' },
      { name: 'name', bksType: 'UNKNOWN' },
    ];

    const columns = await util.connection.listTableColumns('binary_collation');
    expect(columns.map((c) => c.bksField)).toStrictEqual(expectedBksFields);

    const { fields } = await util.connection.selectTop('binary_collation', 0, 10, [], []);
    expect(fields).toStrictEqual(expectedBksFields);
    
  })

  describe("Param tests", () => {
    it("Should be able to handle positional (?) params", async () => {
      await util.paramTest(['?']);
    })
  })

  describe("SSH Tunnel Tests", () => {
    let sshEnvironment;
    let sshDatabase;

    beforeAll(async () => {
      sshEnvironment = new SshEnvironment('mariadb');
      await sshEnvironment.start();
    });

    afterAll(async () => {
      await sshEnvironment?.stop();
    });

    beforeEach(async () => {
      sshDatabase = await sshEnvironment.connect();
    });

    afterEach(async () => {
      await sshDatabase?.disconnect();
    });

    it("should work", async () => {
      await expect(sshDatabase.executeQuery("SELECT 1")).resolves.toBeDefined();
    });

    it("should detect connection lost", async () => {
      const fn = jest.fn();

      sshDatabase.connection.on("connection-lost", fn);

      await sshEnvironment.restart();

      // Must run a query to trigger the connection-lost event
      await expect(sshDatabase.listTables()).rejects.toThrow();

      // Yield to the event loop to allow the "connection-lost" event to fire
      await new Promise((resolve) => setTimeout(resolve));

      expect(fn).toBeCalled();
      expect(sshDatabase.connection.isConnected).toBe(false);
    });

    it("should be able to re-establish connection after losing connection", async () => {
      const isConnectionLost = new Promise((resolve) => {
        sshDatabase.connection.once("connection-lost", resolve);
      });

      await sshEnvironment.restart();

      // Run a query to trigger the connection-lost event
      await expect(sshDatabase.listTables()).rejects.toThrow();

      // Connection-lost is triggered after running a query
      await expect(isConnectionLost).resolvesWithin(1000);

      await sshDatabase.connection.connect();
      expect(sshDatabase.connection.isConnected).toBe(true);
      await expect(sshDatabase.executeQuery("select 1")).resolves.toBeDefined();
    });
  })
})
