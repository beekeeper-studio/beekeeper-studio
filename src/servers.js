import uuid from 'uuid';
import { validate, validateUniqueId } from './validators/server';
import * as config from './config';


export async function getAll() {
  const result = await config.get();
  return result.servers;
}


export async function add(server) {
  const srv = { ...server };
  await validate(srv);

  const data = await config.get();
  const newId = uuid.v4();
  validateUniqueId(data.servers, newId);

  srv.id = newId;
  data.servers.push(srv);
  await config.save(data);

  return srv;
}


export async function update(server) {
  await validate(server);

  const data = await config.get();
  validateUniqueId(data.servers, server.id);

  const index = data.servers.findIndex((srv) => srv.id === server.id);
  data.servers = [
    ...data.servers.slice(0, index),
    server,
    ...data.servers.slice(index + 1),
  ];

  await config.save(data);

  return server;
}


export function addOrUpdate(server) {
  const hasId = !!(server.id && String(server.id).length);
  // TODO: Add validation to check if the current id is a valid uuid
  return hasId ? update(server) : add(server);
}


export async function removeById(id) {
  const data = await config.get();

  const index = data.servers.findIndex((srv) => srv.id === id);
  data.servers = [
    ...data.servers.slice(0, index),
    ...data.servers.slice(index + 1),
  ];

  await config.save(data);
}
