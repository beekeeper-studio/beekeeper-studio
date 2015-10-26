import net from 'net';
import { Client } from 'ssh2';
import { getPort, readFile } from '../../utils';


export default function(serverInfo) {
  return new Promise(async (resolve, reject) => {
    const config = await _configTunnel(serverInfo);

    const connections = [];

    const server = net.createServer(async conn => {
      conn.on('error', err => server.emit('error', err));

      const client = new Client();
      connections.push(conn);

      client.on('error', err => server.emit('error', err));

      client.on('ready', () => {
        connections.push(client);
        client.forwardOut(config.srcHost, config.srcPort, config.dstHost,
          config.dstPort, (err, sshStream) => {
            if (err) {
              server.close();
              server.emit('error', err);
              return;
            }
            sshStream.once('close', () => {
              server.close();
            });
            conn.pipe(sshStream).pipe(conn);
          });
      });

      try {
        const localPort = await getPort();
        client.connect({ ...config, localPort });
      } catch (err) {
        server.emit('error', err);
      }
    });

    server.once('close', () => {
      connections.forEach(conn => conn.end());
    });

    server.listen(config.localPort, config.localHost, err => {
      if (err) return reject(err);
      resolve(server);
    });
  });
}


async function _configTunnel(serverInfo) {
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
  };
  if (serverInfo.ssh.password) config.password = serverInfo.ssh.password;
  if (serverInfo.ssh.privateKey) {
    config.privateKey = await readFile(serverInfo.ssh.privateKey);
  }
  return config;
}
