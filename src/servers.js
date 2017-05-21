import uuid from 'uuid';
import { validate, validateUniqueId } from './validators/server';
import * as config from './config';
import * as crypto from './crypto';


export async function getAll(cryptoSecret) {
  const result = await config.get();
  result.servers.forEach((server) => decryptSecrects(server, cryptoSecret));
  return result.servers;
}


export async function add(server, cryptoSecret) {
  const srv = { ...server };
  await validate(srv);

  const data = await config.get();
  const newId = uuid.v4();
  validateUniqueId(data.servers, newId);

  encryptSecrects(srv, cryptoSecret);

  srv.id = newId;
  data.servers.push(srv);
  await config.save(data);

  return srv;
}


export async function update(server, cryptoSecret) {
  await validate(server);

  const data = await config.get();
  validateUniqueId(data.servers, server.id);

  const index = data.servers.findIndex((srv) => srv.id === server.id);
  encryptSecrects(server, cryptoSecret, data.servers[index]);

  data.servers = [
    ...data.servers.slice(0, index),
    server,
    ...data.servers.slice(index + 1),
  ];

  await config.save(data);

  return server;
}


export function addOrUpdate(server, cryptoSecret) {
  const hasId = !!(server.id && String(server.id).length);
  // TODO: Add validation to check if the current id is a valid uuid
  return hasId ? update(server, cryptoSecret) : add(server, cryptoSecret);
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

// ensure all secret fields are encrypted
function encryptSecrects(server, cryptoSecret, oldSever) {
  /* eslint no-param-reassign:0 */
  if (server.password) {
    const isPassDiff = (
      oldSever &&
      server.password !== crypto.decrypt(oldSever.password, cryptoSecret)
    );

    if (!oldSever || isPassDiff) {
      server.password = crypto.encrypt(server.password, cryptoSecret);
    }
  }

  if (server.ssh && server.ssh.password) {
    const isPassDiff = (
      oldSever &&
      server.ssh.password !== crypto.decrypt(oldSever.ssh.password, cryptoSecret)
    );

    if (!oldSever || isPassDiff) {
      server.ssh.password = crypto.encrypt(server.ssh.password, cryptoSecret);
    }
  }

  server.encrypted = true;
}

// decrypt secret fields
function decryptSecrects(server, cryptoSecret) {
  /* eslint no-param-reassign:0 */
  if (!server.encrypted) {
    return;
  }

  if (server.password) {
    server.password = crypto.decrypt(server.password, cryptoSecret);
  }

  if (server.ssh && server.ssh.password) {
    server.ssh.password = crypto.decrypt(server.ssh.password, cryptoSecret);
  }

  server.encrypted = false;
}
