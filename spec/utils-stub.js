import { join } from 'path';
import { stub } from 'sinon';
import * as utils from '../src/utils';


const FIXTURE_PATH = join(__dirname, './fixtures/.sqlectron.json');
const TMP_FIXTURE_PATH = join(__dirname, './fixtures/.tmp.sqlectron.json');


/* eslint func-names: 0 */
export default {
  TMP_FIXTURE_PATH,

  getConfigPath: {
    install: function({ copyFixtureToTemp }) {
      beforeEach(async function() {
        if (copyFixtureToTemp) {
          const data = await utils.readJSONFile(FIXTURE_PATH);
          await utils.writeJSONFile(TMP_FIXTURE_PATH, data);
        }
        stub(utils, 'getConfigPath').returns(TMP_FIXTURE_PATH);
      });


      afterEach(function() {
        utils.getConfigPath.restore();
      });
    },
  },
};
