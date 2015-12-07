import uuid from 'node-uuid';
import { getConfigPath, writeJSONFile, readJSONFile, fileExists } from './utils';


/**
 * Prepare the configuration file sanitizing and validating all fields availbale
 */
export async function prepare() {
  const filename = getConfigPath();
  const fileExistsResult = await fileExists(filename);
  if (!fileExistsResult) {
    await writeJSONFile(filename, { servers: [] });
  }

  const result = await readJSONFile(filename);

  result.servers = result.servers.map(srv => {
    if (!srv.id) { srv.id = uuid.v4(); }
    return srv;
  });
  await writeJSONFile(filename, result);

  // TODO: Validate whole configuration file
  // if (!configValidate(result)) {
  //   throw new Error('Invalid ~/.sqlectron.json file format');
  // }
}


export function get() {
  const filename = getConfigPath();
  return readJSONFile(filename);
}


export function save(data) {
  const filename = getConfigPath();
  return writeJSONFile(filename, data);
}
