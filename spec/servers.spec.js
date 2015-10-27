import { expect } from 'chai';
import { servers } from '../src';
import { readFile } from './../src/utils';
import utilsStub from './utils-stub';


describe('servers', () => {
  utilsStub.getConfigPath.install({ copyFixtureToTemp: true });

  describe('.loadServerListFromFile', () => {
    it('should be able to load servers from file', async () => {
      const fixture = await loadConfig();
      const config = await servers.loadServerListFromFile();
      expect(config).to.eql(fixture);
    });
  });

  describe('.addServer', () => {
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
      const createdServer = await servers.addServer(newServer);
      expect(createdServer).to.eql(newServer);

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length + 1);
    });
  });

  describe('.updateServer', () => {
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
      const updatedServer = await servers.updateServer(id, serverToUpdate);
      expect(updatedServer).to.eql(serverToUpdate);

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length);
      expect(configAfter.servers[id]).to.eql(serverToUpdate);
    });
  });

  describe('.addOrUpdateServer', () => {
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
        const createdServer = await servers.addOrUpdateServer(null, newServer);
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
        const updatedServer = await servers.addOrUpdateServer(id, serverToUpdate);
        expect(updatedServer).to.eql(serverToUpdate);

        const configAfter = await loadConfig();
        expect(configAfter.servers.length).to.eql(configBefore.servers.length);
        expect(configAfter.servers[id]).to.eql(serverToUpdate);
      });
    });
  });

  describe('.removeServer', () => {
    it('should be able to remove an existing server', async () => {
      const configBefore = await loadConfig();
      await servers.removeServer(0);

      const configAfter = await loadConfig();
      expect(configAfter.servers.length).to.eql(configBefore.servers.length - 1);
      expect(configAfter.servers[0].name).to.not.eql('pg-vm');
    });
  });

  function loadConfig() {
    return readFile(utilsStub.TMP_FIXTURE_PATH);
  }
});
