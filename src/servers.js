import { validate } from './validators/server';
import { getConfigPath, writeFile, readFile, fileExists } from './utils';


export async function loadServerListFromFile() {
  const filename = getConfigPath();
  if (!await fileExists(filename)) {
    await writeFile(filename, { servers: [] });
  }
  const result = await readFile(filename);
  // TODO: Validate whole configuration file
  // if (!serversValidate(result)) {
  //   throw new Error('Invalid ~/.sqlectron.json file format');
  // }
  return result;
}


export async function addServer(server) {
  await validate(server);
  const filename = getConfigPath();

  const data = await readFile(filename);
  data.servers.push(server);
  await writeFile(filename, data);

  return server;
}


export async function updateServer(id, server) {
  await validate(server);

  const filename = getConfigPath();
  const data = await readFile(filename);

  data.servers[id] = server;
  await writeFile(filename, data);

  return server;
}


export async function addOrUpdateServer(id, server) {
  if (isNaN(parseInt(id, 10)) && id >= 0) {
    await addServer(server);
  } else {
    await updateServer(id, server);
  }

  return server;
}


export async function removeServer(id) {
  const filename = getConfigPath();
  const data = await readFile(filename);

  data.servers = [
    ...data.servers.slice(0, id),
    ...data.servers.slice(id + 1),
  ];

  await writeFile(filename, data);
}
