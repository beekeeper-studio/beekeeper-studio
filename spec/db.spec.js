import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { connect, listDatabases, listTables, executeQuery } from '../src/db';
import config from './databases/config';
chai.use(chaiAsPromised);


const SUPPORTED_DB_CLIENTS = {
  mysql: {
    tables: [ 'information_schema', 'sqlectron' ],
  },
  postgresql: {
    tables: [ 'postgres', 'sqlectron' ],
  },
};


describe('db', () => {
  Object.keys(SUPPORTED_DB_CLIENTS).map(function testDBClient(dbClient) {
    const dbClientOpts = SUPPORTED_DB_CLIENTS[dbClient];

    describe(dbClient, () => {
      describe('.connect', () => {
        it(`should be able to connect into a ${dbClient} database`, () => {
          const serverInfo = {
            ...config[dbClient],
            name: dbClient,
            client: dbClient,
          };
          const promise = connect(serverInfo, serverInfo.database);

          return expect(promise).to.not.be.rejected;
        });
      });

      describe('given is already connected', () => {
        beforeEach(() => {
          const serverInfo = {
            ...config[dbClient],
            name: dbClient,
            client: dbClient,
          };

          return connect(serverInfo, serverInfo.database);
        });

        describe('.listDatabases', () => {
          it('should be able to list all databases', async () => {
            const databases = await listDatabases();
            expect(databases).to.eql(dbClientOpts.tables);
          });
        });

        describe('.listTables', () => {
          it('should be able to list all tables', async () => {
            const tables = await listTables();
            expect(tables).to.eql([
              'roles',
              'users',
            ]);
          });
        });

        describe('.executeQuery', () => {
          it('should be able to execute a select', async () => {
            const wrapQueryName = require(`../src/db/clients/${dbClient}`).wrapQueryName;
            const result = await executeQuery(`select * from ${wrapQueryName('users')}`);
            expect(result).to.have.property('rows').to.eql([]);
            expect(result).to.have.deep.property('fields[0].name').to.eql('id');
            expect(result).to.have.deep.property('fields[1].name').to.eql('username');
            expect(result).to.have.deep.property('fields[2].name').to.eql('email');
            expect(result).to.have.deep.property('fields[3].name').to.eql('password');
          });
        });
      });
    });
  });
});
