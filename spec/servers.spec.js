import { expect } from 'chai';
import { servers } from '../src';
import { readFile } from './../src/utils';
import utilsStub from './utils-stub';


describe('servers', () => {
  utilsStub.getConfigPath.install({ copyFixtureToTemp: true });

  describe('.getAll', () => {
    it('should be able to load servers from file', async () => {
      const fixture = await loadConfig();
      const config = await servers.getAll();
      expect(config).to.eql(fixture);
    });
  });

  describe('.add', () => {
    it('should be able to add new server', async () => {
      const configBefore = await loadConfig();
      const newServer = {
        'name': 'mysql',
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
    it('should be able to update existing server', async () => {
      const id = 0;
      const configBefore = await loadConfig();
      const serverToUpdate = {
        'name': 'mysql-vm',
        'client': 'mysql',
        'host': '10.10.10.10',
        'port': 3306,
        'database': 'mydb',
        'user': 'usr',
        'password': 'pwd',
      };
      const updatedServer = await servers.update(id, serverToUpdate);
      expect(updatedServer).to.eql(serverToUpdate);

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length);
      expect(configAfter.servers[id]).to.eql(serverToUpdate);
    });
  });

  describe('.addOrUpdate', () => {
    describe('given is a new server', () => {
      it('should be able to add the new server', async () => {
        const configBefore = await loadConfig();
        const newServer = {
          'name': 'mysql',
          'client': 'mysql',
          'host': '10.10.10.15',
          'port': 3306,
          'database': 'authentication',
          'user': 'root',
          'password': 'password',
        };
        const createdServer = await servers.addOrUpdate(null, newServer);
        expect(createdServer).to.eql(newServer);

        const configAfter = await loadConfig();
        expect(configAfter.servers.length).to.eql(configBefore.servers.length + 1);
      });
    });

    describe('given is an existing server', () => {
      it('should be able to update this existing server', async () => {
        const id = 0;
        const configBefore = await loadConfig();
        const serverToUpdate = {
          'name': 'mysql-vm',
          'client': 'mysql',
          'host': '10.10.10.10',
          'port': 3306,
          'database': 'mydb',
          'user': 'usr',
          'password': 'pwd',
        };
        const updatedServer = await servers.addOrUpdate(id, serverToUpdate);
        expect(updatedServer).to.eql(serverToUpdate);

        const configAfter = await loadConfig();
        expect(configAfter.servers.length).to.eql(configBefore.servers.length);
        expect(configAfter.servers[id]).to.eql(serverToUpdate);
      });
    });
  });

  describe('.remove', () => {
    it('should be able to remove an existing server', async () => {
      const id = 0;
      const configBefore = await loadConfig();
      await servers.remove(id);

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length - 1);
      expect(configAfter.servers[id].name).to.not.eql('pg-vm');
    });
  });

  function loadConfig() {
    return readFile(utilsStub.TMP_FIXTURE_PATH);
  }
});
