import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient';
import { DB_CONFIGS, SshEnvironment } from '@tests/integration/lib/db/clients/ssh/SshEnvironment';
import { createServer } from '@commercial/backend/lib/db/server';
import { ConnectionType, IDbConnectionServerConfig } from '@/lib/db/types';
import { dbtimeout } from '../../../../lib/db'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection';

describe("SSH Tunnel Tests", () => {
  jest.setTimeout(dbtimeout)

  let environment: SshEnvironment;

  function withDatabase(
    func: (getDatabase: () => BasicDatabaseClient<any>) => void
  ) {
    for (const type of Object.keys(DB_CONFIGS) as ConnectionType[]) {

      describe(type, () => {
        let database: BasicDatabaseClient<any>;

        beforeAll(async () => {
          const server = createServer({
            client: type,
            host: DB_CONFIGS[type].service,
            port: DB_CONFIGS[type].port,
            user: 'bks',
            password: 'example',
            ssh: {
              host: environment.getSshHost(),
              port: environment.getSshPort(),
              user: 'beekeeper',
              password: 'password',
            },
          } as IDbConnectionServerConfig);

          database = server.createConnection('test');
          await database.connect();
        });

        afterAll(async () => {
          await database?.disconnect()
        });

        func(() => database);
      });
    }
  }

  beforeAll(async () => {
    await TestOrmConnection.connect()

    const timeoutDefault = 5000
    environment = new SshEnvironment();
    await environment.start();

    jest.setTimeout(timeoutDefault)
  })

  withDatabase((getDatabase) => {
    it("should work", async () => {
      await getDatabase().executeQuery('select 1');
    })

    it("should re-estabilish lost connection", async () => {
      await getDatabase().executeQuery('select 1');
      await environment.restart();
      await getDatabase().executeQuery('select 1');
    });
  });

  afterAll(async () => {
    if (environment) {
      await environment.stop()
    }
    await TestOrmConnection.disconnect()
  })
})
