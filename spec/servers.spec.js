import { expect } from 'chai';
import { servers } from '../src';
import { readJSONFile } from './../src/utils';
import * as crypto from './../src/crypto';
import utilsStub from './utils-stub';

const cryptoSecret = 'CHK`Ya91Hs{me!^8ndwPPaPPxwQ}`';

const assertPassword = (newData, savedData, password) => {
  /* eslint no-param-reassign:0 */
  expect(crypto.decrypt(savedData.password, cryptoSecret)).to.eql(password);
  newData.password = crypto.encrypt(password, cryptoSecret);
  newData.encrypted = true;
};

describe('servers', () => {
  utilsStub.getConfigPath.install({ copyFixtureToTemp: true });

  describe('.getAll', () => {
    it('should load servers from file', async () => {
      const fixture = await loadConfig();
      const result = await servers.getAll();

      // DO NOT decrypt assert data
      const encryptedServer1 = fixture.servers.find((srv) => srv.id === '65f36ca9-331f-43b3-ab38-3f5556fd65ce');
      encryptedServer1.encrypted = true;
      encryptedServer1.password = 'fa1d88ee82bd4439';

      const encryptedServer2 = fixture.servers.find((srv) => srv.id === '179d7c6e-2d7c-4c86-b203-d901b7dfea77');
      encryptedServer2.encrypted = true;
      encryptedServer2.password = 'fa1d88ee82bd4439';
      encryptedServer2.ssh.password = 'fa1d88ee82bd4439';

      expect(result).to.eql(fixture.servers);
    });
  });

  describe('.add', () => {
    it('should add new server', async () => {
      const configBefore = await loadConfig();
      const newServer = {
        name: 'My New Mysql Server',
        client: 'mysql',
        ssl: true,
        host: '10.10.10.15',
        port: 3306,
        database: 'authentication',
        user: 'root',
        password: 'password',
      };
      const createdServer = await servers.add(newServer, cryptoSecret);
      expect(createdServer).to.have.property('id');
      delete createdServer.id;
      assertPassword(newServer, createdServer, 'password');
      expect(createdServer).to.eql(newServer);

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length + 1);
    });

    it('should add new server with ssh', async () => {
      const configBefore = await loadConfig();
      const newServer = {
        name: 'My New Mysql Server',
        client: 'mysql',
        ssl: true,
        host: '10.10.10.15',
        port: 3306,
        database: 'authentication',
        user: 'root',
        password: 'password',
        ssh: {
          host: '10.10.10.10',
          port: 22,
          user: 'root',
          privateKey: '~/.ssh/id_rsa',
          privateKeyWithPassphrase: true,
        },
      };
      const createdServer = await servers.add(newServer, cryptoSecret);
      expect(createdServer).to.have.property('id');
      delete createdServer.id;
      assertPassword(newServer, createdServer, 'password');
      expect(createdServer).to.eql(newServer);

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length + 1);
    });
  });

  describe('.update', () => {
    it('should update existing server', async () => {
      const id = 'ed2d52a7-d8ff-4fdd-897a-7033dee598f4';
      const configBefore = await loadConfig();
      const serverToUpdate = {
        id,
        name: 'mysql-vm',
        client: 'mysql',
        ssl: false,
        host: '10.10.10.10',
        port: 3306,
        database: 'mydb',
        user: 'usr',
        password: 'pwd',
      };
      const updatedServer = await servers.update(serverToUpdate, cryptoSecret);
      expect(updatedServer).to.eql(serverToUpdate);

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length);
      expect(configAfter.servers.find((srv) => srv.id === id))
        .to.eql({ ...serverToUpdate, password: 'fa0b9f', encrypted: true });
    });

    it('should not update encrypted password when password has not changed', async () => {
      const id = '65f36ca9-331f-43b3-ab38-3f5556fd65ce';
      const configBefore = await loadConfig();
      const serverToUpdate = {
        id,
        name: 'mysql-vm',
        client: 'mysql',
        ssl: false,
        host: '10.10.10.10',
        port: 3306,
        database: 'mydb',
        user: 'usr',
        password: 'fa1d88ee82bd4439',
      };
      const updatedServer = await servers.update(serverToUpdate, cryptoSecret);
      expect(updatedServer).to.eql(serverToUpdate);

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length);
      expect(configAfter.servers.find((srv) => srv.id === id))
        .to.eql({ ...serverToUpdate, encrypted: true });
    });
  });

  describe('.addOrUpdate', () => {
    describe('given is a new server', () => {
      it('should add the new server', async () => {
        const configBefore = await loadConfig();
        const newServer = {
          name: 'My New Mysql Server',
          client: 'mysql',
          ssl: false,
          host: '10.10.10.15',
          port: 3306,
          database: 'authentication',
          user: 'root',
          password: 'password',
        };
        const createdServer = await servers.addOrUpdate(newServer, cryptoSecret);
        expect(createdServer).to.have.property('id');
        delete createdServer.id;
        assertPassword(newServer, createdServer, 'password');
        expect(createdServer).to.eql(newServer);

        const configAfter = await loadConfig();
        expect(configAfter.servers.length).to.eql(configBefore.servers.length + 1);
      });
    });

    describe('given is an existing server', () => {
      it('should update this existing server', async () => {
        const configBefore = await loadConfig();
        const id = 'ed2d52a7-d8ff-4fdd-897a-7033dee598f4';
        const serverToUpdate = {
          id,
          name: 'mysql-vm',
          client: 'mysql',
          ssl: false,
          host: '10.10.10.10',
          port: 3306,
          database: 'mydb',
          user: 'usr',
          password: 'pwd',
        };
        const updatedServer = await servers.addOrUpdate(serverToUpdate, cryptoSecret);
        expect(updatedServer).to.eql(serverToUpdate);

        const configAfter = await loadConfig();
        expect(configAfter.servers.length).to.eql(configBefore.servers.length);
        expect(configAfter.servers.find((srv) => srv.id === id))
          .to.eql({ ...serverToUpdate, password: 'fa0b9f', encrypted: true });
      });
    });
  });

  describe('.remove', () => {
    it('should remove an existing server', async () => {
      const configBefore = await loadConfig();
      await servers.removeById('c94cbafa-8977-4142-9f34-c84d382d8731');

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length - 1);
      expect(configAfter.servers.find((srv) => srv.name === 'pg-vm')).to.eql(undefined);
    });
  });

  function loadConfig() {
    return readJSONFile(utilsStub.TMP_FIXTURE_PATH);
  }
});
