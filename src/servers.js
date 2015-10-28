import { validate, validateUniqueName } from './validators/server';
import { getConfigPath, writeJSONFile, readJSONFile, fileExists } from './utils';


export async function getAll() {
  const filename = getConfigPath();
  if (!await fileExists(filename)) {
    await writeJSONFile(filename, { servers: [] });
  }
  const result = await readJSONFile(filename);
  // TODO: Validate whole configuration file
  // if (!serversValidate(result)) {
  //   throw new Error('Invalid ~/.sqlectron.json file format');
  // }
  return result;
}


export async function add(server) {
  await validate(server);
  const filename = getConfigPath();

  const data = await readJSONFile(filename);
  validateUniqueName(data.servers, server.name);

  data.servers.push(server);
  await writeJSONFile(filename, data);

  return server;
}


export async function update(currentName, server) {
  await validate(server);

  const filename = getConfigPath();
  const data = await readJSONFile(filename);
  validateUniqueName(data.servers, server.name, currentName);

  const index = data.servers.findIndex(srv => srv.name === currentName);
  data.servers = [
    ...data.servers.slice(0, index),
    server,
    ...data.servers.slice(index + 1),
  ];

  await writeJSONFile(filename, data);

  return server;
}


export async function addOrUpdate(currentName, server) {
  const hasCurrentName = !!(currentName && (currentName + '').length);
  return hasCurrentName ? update(currentName, server) : add(server);
}


export async function removeByName(currentName) {
  const filename = getConfigPath();
  const data = await readJSONFile(filename);

  const index = data.servers.findIndex(srv => srv.name === currentName);
  data.servers = [
    ...data.servers.slice(0, index),
    ...data.servers.slice(index + 1),
  ];

  await writeJSONFile(filename, data);
}
