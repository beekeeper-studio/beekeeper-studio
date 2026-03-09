import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient';
import { IDbConnectionPublicServer } from '@/lib/db/serverTypes';
import { SshEnvironment } from '@tests/integration/lib/db/clients/ssh/SshEnvironment';
import ConnectionProvider from '@commercial/backend/lib/connection-provider';
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection';



describe("SSH Tunnel Tests", () => {
  jest.setTimeout(dbtimeout)

  let environment: SshEnvironment;
  let connection: IDbConnectionPublicServer;
  let database: BasicDatabaseClient<any>;

  beforeAll(async () => {
    await TestOrmConnection.connect()

    const timeoutDefault = 5000
    environment = new SshEnvironment();
    await environment.start();

    jest.setTimeout(timeoutDefault)

    const quickConfig = {
      host: environment.getDbHost(),
      port: environment.getDbPort(),
      username: 'postgres',
      password: 'example',
      connectionType: 'postgresql'
    }

    // NB: If this fails it's due to ipv4 vs ipv6 mixup.
    // as of Node 17+ DNS defaults to v6 instead of v4.
    const config = {
      connectionType: 'postgresql',
      host: 'postgres',
      port: 5432,
      username: 'postgres',
      password: 'example',
      sshEnabled: true,
      sshHost: environment.getSshHost(),
      sshPort: environment.getSshPort(),
      sshUsername: 'beekeeper',
      sshPassword: 'password'
    }

    const qc = ConnectionProvider.for(quickConfig)
    const qdb = qc.createConnection('integration_test')
    await qdb.connect()
    const query = await qdb.query('select 1');
    await query.execute()
    await qdb.disconnect();

    connection = ConnectionProvider.for(config)
    database = connection.createConnection('integration_test')
    await database.connect()
  })

  describe("Can SSH and run a query", () => {
    it("should work", async () => {
      await database.executeQuery('select 1');
    })

    it("should re-estabilish lost connection", async () => {
      await environment.restart();
      await database.executeQuery('select 1');
    });
  })

  afterAll(async () => {
    if (database) {
      await database.disconnect()
    }
    if (environment) {
      await environment.stop()
    }
    await TestOrmConnection.disconnect()
  })
})
