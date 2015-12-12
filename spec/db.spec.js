import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { db } from '../src';
import config from './databases/config';
chai.use(chaiAsPromised);

/**
 * List of supported DB clients.
 * The "integration" tests will be executed for all supported DB clients.
 * And ensure all these clients has the same API and output results.
 */
const SUPPORTED_DB_CLIENTS = ['mysql', 'postgresql', 'sqlserver'];


/**
 * List of selected databases to be tested in the current task
 */
const dbsToTest = process.env.DB_CLIENTS.split(',');


describe('db', () => {
  const dbClients = dbsToTest.length ? dbsToTest : SUPPORTED_DB_CLIENTS;
  if (dbClients.some(dbClient => !~SUPPORTED_DB_CLIENTS.indexOf(dbClient))) {
    throw new Error('Invalid selected db client for tests');
  }

  dbClients.map(dbClient => {
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
            expect(tables).to.include.members(['users', 'roles']);
          });
        });

        describe('.executeQuery', () => {
          beforeEach(() => Promise.all([
            db.executeQuery(`
              INSERT INTO users (username, email, password)
              VALUES ('maxcnunes', 'maxcnunes@gmail.com', '123456')
            `),
            db.executeQuery(`
              INSERT INTO roles (name)
              VALUES ('developer')
            `),
          ]));

          afterEach(db.truncateAllTables);

          describe('SELECT', () => {
            it('should execute a single query', async () => {
              const result = await db.executeQuery(`select * from users`);
              expect(result).to.have.deep.property('fields[0].name').to.eql('id');
              expect(result).to.have.deep.property('fields[1].name').to.eql('username');
              expect(result).to.have.deep.property('fields[2].name').to.eql('email');
              expect(result).to.have.deep.property('fields[3].name').to.eql('password');

              expect(result).to.have.deep.property('rows[0].id').to.eql(1);
              expect(result).to.have.deep.property('rows[0].username').to.eql('maxcnunes');
              expect(result).to.have.deep.property('rows[0].password').to.eql('123456');
              expect(result).to.have.deep.property('rows[0].email').to.eql('maxcnunes@gmail.com');

              expect(result).to.have.property('rowCount').to.eql(1);
            });

            it('should execute multiple queries', async () => {
              const result = await db.executeQuery(`
                select * from users;
                select * from roles;
              `);

              expect(result).to.have.deep.property('fields[0][0].name').to.eql('id');
              expect(result).to.have.deep.property('fields[0][1].name').to.eql('username');
              expect(result).to.have.deep.property('fields[0][2].name').to.eql('email');
              expect(result).to.have.deep.property('fields[0][3].name').to.eql('password');

              expect(result).to.have.deep.property('rows[0][0].id').to.eql(1);
              expect(result).to.have.deep.property('rows[0][0].username').to.eql('maxcnunes');
              expect(result).to.have.deep.property('rows[0][0].password').to.eql('123456');
              expect(result).to.have.deep.property('rows[0][0].email').to.eql('maxcnunes@gmail.com');

              expect(result).to.have.deep.property('rowCount[0]').to.eql(1);

              expect(result).to.have.deep.property('fields[1][0].name').to.eql('id');
              expect(result).to.have.deep.property('fields[1][1].name').to.eql('name');

              expect(result).to.have.deep.property('rows[1][0].id').to.eql(1);
              expect(result).to.have.deep.property('rows[1][0].name').to.eql('developer');

              expect(result).to.have.deep.property('rowCount[1]').to.eql(1);
            });
          });

          describe('INSERT', () => {
            it('should execute a single query', async () => {
              const result = await db.executeQuery(`
                insert into users (username, email, password)
                values ('user', 'user@hotmail.com', '123456')
              `);

              expect(result).to.have.property('rows').to.eql([]);
              expect(result).to.have.property('fields').to.eql([]);
              expect(result).to.have.property('affectedRows').to.eql(1);
              expect(result).to.have.property('rowCount').to.eql(undefined);
            });

            it('should execute multiple queries', async () => {
              const result = await db.executeQuery(`
                insert into users (username, email, password)
                values ('user', 'user@hotmail.com', '123456');

                insert into roles (name)
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
                delete from users where username = 'maxcnunes'
              `);

              expect(result).to.have.property('rows').to.eql([]);
              expect(result).to.have.property('fields').to.eql([]);
              expect(result).to.have.property('affectedRows').to.eql(1);
              expect(result).to.have.property('rowCount').to.eql(undefined);
            });

            it('should execute multiple queries', async () => {
              const result = await db.executeQuery(`
                delete from users where username = 'maxcnunes';
                delete from roles where name = 'developer';
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
                update users set username = 'max' where username = 'maxcnunes'
              `);

              expect(result).to.have.property('rows').to.eql([]);
              expect(result).to.have.property('fields').to.eql([]);
              expect(result).to.have.property('affectedRows').to.eql(1);
              expect(result).to.have.property('rowCount').to.eql(undefined);
            });

            it('should execute multiple queries', async () => {
              const result = await db.executeQuery(`
                update users set username = 'max' where username = 'maxcnunes';
                update roles set name = 'dev' where name = 'developer';
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
