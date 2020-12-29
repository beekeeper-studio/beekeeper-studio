import { GenericContainer } from 'testcontainers'
import { DBTestUtil, dbtimeout } from '../../../../lib/db'
import { Duration, TemporalUnit } from "node-duration"

describe("MySQL Tests", () => {

  let container;
  let util

  beforeAll(async () => {
    const timeoutDefault = 5000
    jest.setTimeout(dbtimeout)
    container = await new GenericContainer("mysql")
      .withName("testmysql")
      .withEnv("MYSQL_ROOT_PASSWORD", "test")
      .withEnv("MYSQL_DATABASE", "test")
      .withExposedPorts(3306)
      .withStartupTimeout(new Duration(dbtimeout, TemporalUnit.MILLISECONDS))
      .start()
    jest.setTimeout(timeoutDefault)
    const config = {
      client: 'mysql',
      host: container.getContainerIpAddress(),
      port: container.getMappedPort(3306),
      user: 'root',
      password: 'test'
    }
    util = new DBTestUtil(config, "test")
    await util.setupdb()

    const functionDDL = `
        CREATE FUNCTION isEligible(
        age INTEGER,
        bananas varchar(30)
        )
        RETURNS VARCHAR(20)
        DETERMINISTIC
        BEGIN
        IF age > 18 THEN
        RETURN ("yes");
        ELSE
        RETURN ("No");
        END IF;
        END
    `

    const routine1DDL = `
    CREATE PROCEDURE proc_userdetails(IN uid INT)
      BEGIN
      SELECT id, name, email, status FROM user WHERE id = uid;
      END
    `
    const routine2DDL = `
      CREATE PROCEDURE no_parameters()
        BEGIN
        SELECT id, name, email, status FROM user limit 10;
        END
    `
    await util.knex.schema.raw(functionDDL)
    await util.knex.schema.raw(routine1DDL)
    await util.knex.schema.raw(routine2DDL)
  })

  afterAll(async() => {
    if (util.connection) {
      await util.connection.disconnect()
    }
    if (container) {
      await container.stop()
    }
  })

  it("Should pass standard tests", async () => {
    await util.testdb()
  })

  it("Should fetch routines correctly", async () => {
    const routines = await util.connection.listRoutines()
    expect(routines.length).toBe(3)
    const procedures = routines.filter((r) => (r.type === 'procedure'))
    const functions = routines.filter((r) => (r.type === 'function'))

    expect(functions.length).toBe(1)
    expect(procedures.length).toBe(2)

    expect(procedures.map((p) => (p.name))).toMatchObject(['no_parameters', 'proc_userdetails'])
    expect(functions.map((p) => (p.name))).toMatchObject(['isEligible'])

    expect(procedures.find((p) => (p.name === 'proc_userdetails')).routineParams.length).toBe(1)
    expect(procedures.find((p) => (p.name === 'no_parameters')).routineParams.length).toBe(0)
    expect(functions.find((p) => (p.name === 'isEligible')).routineParams.length).toBe(2)
  })
})