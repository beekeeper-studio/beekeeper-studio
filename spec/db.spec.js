import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { db } from '../src';
import config from './databases/config';
chai.use(chaiAsPromised);


const SUPPORTED_DB_CLIENTS = {
  mysql: {
    defaulTables: [ 'information_schema' ],
  },
  postgresql: {
    defaulTables: [ 'postgres' ],
  },
};


describe('db', () => {
  Object.keys(SUPPORTED_DB_CLIENTS).map(function testDBClient(dbClient) {
    const dbClientOpts = SUPPORTED_DB_CLIENTS[dbClient];

    describe(dbClient, () => {
      describe('.connect', () => {
        it(`should connect into a ${dbClient} database`, () => {
          const serverInfo = {
            ...config[dbClient],
            name: dbClient,
            client: dbClient,
          };
          const promise = db.connect(serverInfo, serverInfo.database);

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

          return db.connect(serverInfo, serverInfo.database);
        });

        describe('.listDatabases', () => {
          it('should list all databases', async () => {
            const databases = await db.listDatabases();
            expect(databases).to.eql([
              ...dbClientOpts.defaulTables,
              'sqlectron',
            ]);
          });
        });

        describe('.listTables', () => {
          it('should list all tables', async () => {
            const tables = await db.listTables();
            expect(tables).to.eql([
              'roles',
              'users',
            ]);
          });
        });

        describe('.executeQuery', () => {
          it('should execute a select', async () => {
            const wrapQuery = require(`../src/db/clients/${dbClient}`).wrapQuery;
            const result = await db.executeQuery(`select * from ${wrapQuery('users')}`);
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
