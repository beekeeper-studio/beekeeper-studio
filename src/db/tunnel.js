import net from 'net';
import { Client } from 'ssh2';
import { getPort, readFile } from '../utils';
import createDebug from '../debug';


const debug = createDebug('db:tunnel');


export default function (serverInfo) {
  return new Promise(async (resolve, reject) => {
    debug('configuring tunnel');
    const config = await configTunnel(serverInfo);

    const connections = [];

    debug('creating ssh tunnel server');
    const server = net.createServer(async (conn) => {
      conn.on('error', (err) => server.emit('error', err));

      debug('creating ssh tunnel client');
      const client = new Client();
      connections.push(conn);

      client.on('error', (err) => server.emit('error', err));

      client.on('ready', () => {
        debug('connected ssh tunnel client');
        connections.push(client);

        debug('forwarding ssh tunnel client output');
        client.forwardOut(
          config.srcHost,
          config.srcPort,
          config.dstHost,
          config.dstPort,
          (err, sshStream) => {
            if (err) {
              debug('error ssh connection %j', err);
              server.close();
              server.emit('error', err);
              return;
            }
            server.emit('success');
            conn.pipe(sshStream).pipe(conn);
          });
      });

      try {
        const localPort = await getPort();

        debug('connecting ssh tunnel client');
        client.connect({ ...config, localPort });
      } catch (err) {
        server.emit('error', err);
      }
    });

    server.once('close', () => {
      debug('close ssh tunnel server');
      connections.forEach((conn) => conn.end());
    });

    debug('connecting ssh tunnel server');
    server.listen(config.localPort, config.localHost, (err) => {
      if (err) return reject(err);

      debug('connected ssh tunnel server');
      resolve(server);
    });
  });
}


async function configTunnel(serverInfo) {
  const config = {
    username: serverInfo.ssh.user,
    port: serverInfo.ssh.port,
    host: serverInfo.ssh.host,
    dstPort: serverInfo.port,
    dstHost: serverInfo.host,
    sshPort: 22,
    srcPort: 0,
    srcHost: 'localhost',
    localHost: 'localhost',
    localPort: await getPort(),
  };
  if (serverInfo.ssh.password) config.password = serverInfo.ssh.password;
  if (serverInfo.ssh.passphrase) config.passphrase = serverInfo.ssh.passphrase;
  if (serverInfo.ssh.privateKey) {
    config.privateKey = await readFile(serverInfo.ssh.privateKey);
  }
  return config;
}
