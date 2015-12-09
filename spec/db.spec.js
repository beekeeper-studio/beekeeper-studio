import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { db } from '../src';
import config from './databases/config';
import * as dbSpecHelper from './databases/helper';
chai.use(chaiAsPromised);


/**
 * List of supported DB clients.
 * The "integration" tests will be executed for all supported DB clients.
 * And ensure all these clients has the same API and output results.
 */
const SUPPORTED_DB_CLIENTS = ['mysql', 'postgresql'];


describe('db', () => {
  SUPPORTED_DB_CLIENTS.map(function testDBClient(dbClient) {
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
        const serverInfo = {
          ...config[dbClient],
          name: dbClient,
          client: dbClient,
        };

        dbSpecHelper.config(serverInfo, dbClientOpts);

        beforeEach(() => {
          return db.connect(serverInfo, serverInfo.database);
        });

        describe('.listDatabases', () => {
          it('should list all databases', async () => {
            const databases = await db.listDatabases();
            expect(databases).to.include.members(['sqlectron']);
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
          const wrapQuery = require(`../src/db/clients/${dbClient}`).wrapQuery;

          beforeEach(function beforeEach() {
            return Promise.all([
              this.knex.raw(`
                INSERT INTO ${wrapQuery('users')} (username, email, password)
                VALUES ('maxcnunes', 'maxcnunes@gmail.com', '123456')
              `),
              this.knex.raw(`
                INSERT INTO ${wrapQuery('roles')} (name)
                VALUES ('developer')
              `),
            ]);
          });

          describe('SELECT', () => {
            it('should execute a single query', async () => {
              const result = await db.executeQuery(`select * from ${wrapQuery('users')}`);
              expect(result).to.have.deep.property('fields[0].name').to.eql('id');
              expect(result).to.have.deep.property('fields[1].name').to.eql('username');
              expect(result).to.have.deep.property('fields[2].name').to.eql('email');
              expect(result).to.have.deep.property('fields[3].name').to.eql('password');

              expect(result).to.have.deep.property('rows[0].id').to.eql(1);
              expect(result).to.have.deep.property('rows[0].username').to.eql('maxcnunes');
              expect(result).to.have.deep.property('rows[0].password').to.eql('123456');
              expect(result).to.have.deep.property('rows[0].email').to.eql('maxcnunes@gmail.com');
            });

            it('should execute multiple queries', async () => {
              const result = await db.executeQuery(`
                select * from ${wrapQuery('users')};
                select * from ${wrapQuery('roles')};
              `);

              expect(result).to.have.deep.property('fields[0][0].name').to.eql('id');
              expect(result).to.have.deep.property('fields[0][1].name').to.eql('username');
              expect(result).to.have.deep.property('fields[0][2].name').to.eql('email');
              expect(result).to.have.deep.property('fields[0][3].name').to.eql('password');

              expect(result).to.have.deep.property('rows[0][0].id').to.eql(1);
              expect(result).to.have.deep.property('rows[0][0].username').to.eql('maxcnunes');
              expect(result).to.have.deep.property('rows[0][0].password').to.eql('123456');
              expect(result).to.have.deep.property('rows[0][0].email').to.eql('maxcnunes@gmail.com');

              expect(result).to.have.deep.property('fields[1][0].name').to.eql('id');
              expect(result).to.have.deep.property('fields[1][1].name').to.eql('name');

              expect(result).to.have.deep.property('rows[1][0].id').to.eql(1);
              expect(result).to.have.deep.property('rows[1][0].name').to.eql('developer');
            });
          });

          describe('INSERT', () => {
            it('should execute a single query', async () => {
              const result = await db.executeQuery(`
                insert into ${wrapQuery('users')} (username, email, password)
                values ('user', 'user@hotmail.com', '123456')
              `);

              expect(result).to.have.property('rows').to.eql([]);
              expect(result).to.have.property('fields').to.eql([]);
              expect(result).to.have.property('affectedRows').to.eql(1);
              expect(result).to.have.property('rowCount').to.eql(undefined);
            });

            it('should execute multiple queries', async () => {
              const result = await db.executeQuery(`
                insert into ${wrapQuery('users')} (username, email, password)
                values ('user', 'user@hotmail.com', '123456');

                insert into ${wrapQuery('roles')} (name)
                values ('manager')
              `);

              expect(result).to.have.property('rows').to.eql([ [], [] ]);
              expect(result).to.have.property('fields').to.eql([ [], [] ]);
              expect(result).to.have.property('affectedRows').to.eql([ 1, 1 ]);
              expect(result).to.have.property('rowCount').to.eql([ undefined, undefined ]);
            });
          });

          describe('DELETE', () => {
            it('should execute a single query', async () => {
              const result = await db.executeQuery(`
                delete from ${wrapQuery('users')} where username = 'maxcnunes'
              `);

              expect(result).to.have.property('rows').to.eql([]);
              expect(result).to.have.property('fields').to.eql([]);
              expect(result).to.have.property('affectedRows').to.eql(1);
              expect(result).to.have.property('rowCount').to.eql(undefined);
            });

            it('should execute multiple queries', async () => {
              const result = await db.executeQuery(`
                delete from ${wrapQuery('users')} where username = 'maxcnunes';
                delete from ${wrapQuery('roles')} where name = 'developer';
              `);

              expect(result).to.have.property('rows').to.eql([ [], [] ]);
              expect(result).to.have.property('fields').to.eql([ [], [] ]);
              expect(result).to.have.property('affectedRows').to.eql([ 1, 1 ]);
              expect(result).to.have.property('rowCount').to.eql([ undefined, undefined ]);
            });
          });

          describe('UPDATE', () => {
            it('should execute a single query', async () => {
              const result = await db.executeQuery(`
                update ${wrapQuery('users')} set username = 'max' where username = 'maxcnunes'
              `);

              expect(result).to.have.property('rows').to.eql([]);
              expect(result).to.have.property('fields').to.eql([]);
              expect(result).to.have.property('affectedRows').to.eql(1);
              expect(result).to.have.property('rowCount').to.eql(undefined);
            });

            it('should execute multiple queries', async () => {
              const result = await db.executeQuery(`
                update ${wrapQuery('users')} set username = 'max' where username = 'maxcnunes';
                update ${wrapQuery('roles')} set name = 'dev' where name = 'developer';
              `);

              expect(result).to.have.property('rows').to.eql([ [], [] ]);
              expect(result).to.have.property('fields').to.eql([ [], [] ]);
              expect(result).to.have.property('affectedRows').to.eql([ 1, 1 ]);
              expect(result).to.have.property('rowCount').to.eql([ undefined, undefined ]);
            });
          });
        });
      });
    });
  });
});
