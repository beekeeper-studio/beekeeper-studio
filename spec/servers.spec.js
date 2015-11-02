import { expect } from 'chai';
import { servers } from '../src';
import { readJSONFile } from './../src/utils';
import utilsStub from './utils-stub';


describe('servers', () => {
  utilsStub.getConfigPath.install({ copyFixtureToTemp: true });

  describe('.prepareConfiguration', () => {
    it('should include id for those servers without it', async () => {
      const findItem = (data) => data.servers.find(srv => srv.name === 'without-id');

      const fixtureBefore = await loadConfig();
      await servers.prepareConfiguration();
      const fixtureAfter = await loadConfig();

      expect(findItem(fixtureBefore)).to.not.have.property('id');
      expect(findItem(fixtureAfter)).to.have.property('id');
    });
  });

  describe('.getAll', () => {
    it('should load servers from file', async () => {
      const fixture = await loadConfig();
      const config = await servers.getAll();
      expect(config).to.eql(fixture);
    });
  });

  describe('.add', () => {
    it('should add new server', async () => {
      const configBefore = await loadConfig();
      const newServer = {
        'name': 'My New Mysql Server',
        'client': 'mysql',
        'host': '10.10.10.15',
        'port': 3306,
        'database': 'authentication',
        'user': 'root',
        'password': 'password',
      };
      const createdServer = await servers.add(newServer);
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
        'name': 'mysql-vm',
        'client': 'mysql',
        'host': '10.10.10.10',
        'port': 3306,
        'database': 'mydb',
        'user': 'usr',
        'password': 'pwd',
      };
      const updatedServer = await servers.update(serverToUpdate);
      expect(updatedServer).to.eql(serverToUpdate);

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length);
      expect(configAfter.servers.find(srv => srv.id === id)).to.eql(serverToUpdate);
    });
  });

  describe('.addOrUpdate', () => {
    describe('given is a new server', () => {
      it('should add the new server', async () => {
        const configBefore = await loadConfig();
        const newServer = {
          'name': 'My New Mysql Server',
          'client': 'mysql',
          'host': '10.10.10.15',
          'port': 3306,
          'database': 'authentication',
          'user': 'root',
          'password': 'password',
        };
        const createdServer = await servers.addOrUpdate(newServer);
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
          'name': 'mysql-vm',
          'client': 'mysql',
          'host': '10.10.10.10',
          'port': 3306,
          'database': 'mydb',
          'user': 'usr',
          'password': 'pwd',
        };
        const updatedServer = await servers.addOrUpdate(serverToUpdate);
        expect(updatedServer).to.eql(serverToUpdate);

        const configAfter = await loadConfig();
        expect(configAfter.servers.length).to.eql(configBefore.servers.length);
        expect(configAfter.servers.find(srv => srv.id === id)).to.eql(serverToUpdate);
      });
    });
  });

  describe('.remove', () => {
    it('should remove an existing server', async () => {
      const configBefore = await loadConfig();
      await servers.removeById('c94cbafa-8977-4142-9f34-c84d382d8731');

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length - 1);
      expect(configAfter.servers.find(srv => srv.name === 'pg-vm')).to.eql(undefined);
    });
  });

  function loadConfig() {
    return readJSONFile(utilsStub.TMP_FIXTURE_PATH);
  }
});
