import uuid from 'node-uuid';
import { validate, validateUniqueId } from './validators/server';
import { getConfigPath, writeJSONFile, readJSONFile, fileExists } from './utils';


export async function prepareConfiguration() {
  const filename = getConfigPath();
  if (!await fileExists(filename)) {
    await writeJSONFile(filename, { servers: [] });
  }

  const result = await readJSONFile(filename);

  result.servers = result.servers.map(srv => {
    if (!srv.id) { srv.id = uuid.v4(); }
    return srv;
  });
  await writeJSONFile(filename, result);

  // TODO: Validate whole configuration file
  // if (!serversValidate(result)) {
  //   throw new Error('Invalid ~/.sqlectron.json file format');
  // }
}


export async function getAll() {
  const filename = getConfigPath();
  const result = await readJSONFile(filename);
  return result;
}


export async function add(server) {
  await validate(server);
  const filename = getConfigPath();

  const data = await readJSONFile(filename);
  const newId = uuid.v4();
  validateUniqueId(data.servers, newId);

  server.id = newId;
  data.servers.push(server);
  await writeJSONFile(filename, data);

  return server;
}


export async function update(server) {
  await validate(server);

  const filename = getConfigPath();
  const data = await readJSONFile(filename);
  validateUniqueId(data.servers, server.id);

  const index = data.servers.findIndex(srv => srv.id === server.id);
  data.servers = [
    ...data.servers.slice(0, index),
    server,
    ...data.servers.slice(index + 1),
  ];

  await writeJSONFile(filename, data);

  return server;
}


export async function addOrUpdate(server) {
  const hasId = !!(server.id && (server.id + '').length);
  // TODO: Add validation to check if the current id is a valid uuid
  return hasId ? update(server) : add(server);
}


export async function removeById(id) {
  const filename = getConfigPath();
  const data = await readJSONFile(filename);

  const index = data.servers.findIndex(srv => srv.id === id);
  data.servers = [
    ...data.servers.slice(0, index),
    ...data.servers.slice(index + 1),
  ];

  await writeJSONFile(filename, data);
}
