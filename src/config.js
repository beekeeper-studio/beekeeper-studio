import uuid from 'uuid';
import * as utils from './utils';


/**
 * Prepare the configuration file sanitizing and validating all fields availbale
 */
export async function prepare() {
  const filename = utils.getConfigPath();
  const fileExistsResult = await utils.fileExists(filename);
  if (!fileExistsResult) {
    await utils.writeJSONFile(filename, { servers: [] });
  }

  const result = await utils.readJSONFile(filename);

  result.servers = result.servers.map((server) => {
    const srv = { ...server };
    // ensure all server has an unique id
    if (!srv.id) { srv.id = uuid.v4(); }

    // ensure all servers has the new fileld SSL
    if (srv.ssl === undefined) { srv.ssl = false; }

    return srv;
  });
  await utils.writeJSONFile(filename, result);

  // TODO: Validate whole configuration file
  // if (!configValidate(result)) {
  //   throw new Error('Invalid ~/.sqlectron.json file format');
  // }
}

export function path() {
  const filename = utils.getConfigPath();
  return utils.resolveHomePathToAbsolute(filename);
}

export function get() {
  const filename = utils.getConfigPath();
  return utils.readJSONFile(filename);
}

export function getSync() {
  const filename = utils.getConfigPath();
  return utils.readJSONFileSync(filename);
}


export function save(data) {
  const filename = utils.getConfigPath();
  return utils.writeJSONFile(filename, data);
}
