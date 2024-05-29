import { MessagePortMain } from 'electron';
import rawLog from 'electron-log'
import ORMConnection from './common/appdb/Connection'
import platformInfo from './common/platform_info';
import { connHandlers } from './handlers/connHandlers';
import { generatorHandlers } from './handlers/generatorHandlers';
import { Handlers } from './handlers/handlers';
import { queryHandlers } from './handlers/queryHandlers';

const log = rawLog.scope('UtilityProcess');

let port: MessagePortMain;
let ormConnection: ORMConnection;

interface Reply {
  id: string,
  type: 'reply' | 'error',
  data?: any,
  error?: string
}

export let handlers: Handlers = {
  ...connHandlers,
  ...queryHandlers,
  ...generatorHandlers
}; 

process.parentPort.on('message', ({ ports }) => {
  if (ports && ports.length > 0) {
    port = ports[0]
    log.info('RECEIVED PORT: ', port);
    init();
    port.start();
  }
})

async function runHandler(id: string, name: string, args: any) {
  log.info('RECEIVED REQUEST FOR NAME, ID: ', name, id);
  let replyArgs: Reply = {
    id,
    type: 'reply',
  };

  if (handlers[name]) {
    try {
      replyArgs.data = await handlers[name](args)
    } catch (e) {
      replyArgs.type = 'error';
      replyArgs.error = e?.message ?? e
    }
  } else {
    replyArgs.type = 'error';
    replyArgs.error = 'Invalid handler name';
  }

  port.postMessage(replyArgs);
}

function init() {
  ormConnection = new ORMConnection(platformInfo.appDbPath, false);
  ormConnection.connect();

  port.on('message',  ({ data }) => {
    const { id, name, args } = data;
    runHandler(id, name, args);
  })
}
