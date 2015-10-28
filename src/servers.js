import { validate } from './validators/server';
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
  data.servers.push(server);
  await writeJSONFile(filename, data);

  return server;
}


export async function update(id, server) {
  await validate(server);

  const filename = getConfigPath();
  const data = await readJSONFile(filename);

  data.servers[id] = server;
  await writeJSONFile(filename, data);

  return server;
}


export async function addOrUpdate(id, server) {
  if (isNaN(parseInt(id, 10)) && id >= 0) {
    await add(server);
  } else {
    await update(id, server);
  }

  return server;
}


export async function remove(id) {
  const filename = getConfigPath();
  const data = await readJSONFile(filename);

  data.servers = [
    ...data.servers.slice(0, id),
    ...data.servers.slice(id + 1),
  ];

  await writeJSONFile(filename, data);
}
