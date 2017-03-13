import { expect } from 'chai';
import { config } from '../src';
import { readJSONFile } from './../src/utils';
import utilsStub from './utils-stub';

const cryptoSecret = 'CHK`Ya91Hs{me!^8ndwPPaPPxwQ}`';

describe('config', () => {
  utilsStub.getConfigPath.install({ copyFixtureToTemp: true });

  describe('.prepare', () => {
    it('should include id for those servers without it', async () => {
      const findItem = (data) => data.servers.find((srv) => srv.name === 'without-id');

      const fixtureBefore = await loadConfig();
      await config.prepare(cryptoSecret);
      const fixtureAfter = await loadConfig();

      expect(findItem(fixtureBefore)).to.not.have.property('id');
      expect(findItem(fixtureAfter)).to.have.property('id');
    });
  });

  function loadConfig() {
    return readJSONFile(utilsStub.TMP_FIXTURE_PATH);
  }
});
