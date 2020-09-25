import path from 'path'
import { DockerComposeEnvironment, Wait } from 'testcontainers'
import { createServer } from '../../../../../src/lib/db/index'

const tests = [
  async (cli) => await cli.listTables(),
  async (cli) => await cli.listViews()
]


describe("Database client testing", () => {
  let environment
  

  beforeAll(async () => {
    const p = path.join(__dirname, '../../../..docker/postgres')
    environment = await new DockerComposeEnvironment(p, 'docker-compose.yml')
      .withWaitStrategy('psql', Wait.forHealthCheck())
      .up()
  })

  it("can perform all basic functions", async () => {
    const pc = environment.getContainer("psql");
    const config = {
      client: 'postgres',
      host: pc.getContainerIpAddress(),
      port: pc.getMappedPort(5432),
      domain: null,
      user: 'postgres',
      password: 'example'
    }

    const server = createServer(config)
    const connection = server.createConnection('sakila')
    await connection.connect()

    for (let i = 0; i < test.length; i++) {
      const func = test[i];
      await func()
    }

  })
  
})