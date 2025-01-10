import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { runCommonTests } from './all'

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
})
