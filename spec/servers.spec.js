import { join } from 'path';
import { expect } from 'chai';
import { stub } from 'sinon';
import { servers } from '../src';
import * as utils from '../src/utils';

const FIXTURE_PATH = join(__dirname, './fixtures/.sqlectron.json');
const fixture = require(FIXTURE_PATH);


describe('servers', () => {
  beforeEach(() => {
    stub(utils, 'getConfigPath').returns(FIXTURE_PATH);
  });

  it('should be able to load servers from file', async () => {
    const config = await servers.loadServerListFromFile();
    expect(config).to.eql(fixture);
  });
});
