import rawLog from 'electron-log'
import ORMConnection from './common/appdb/Connection'
import platformInfo from './common/platform_info';
import { connHandlers } from './handlers/connHandlers';
import { exportHandlers } from './handlers/exportHandlers';
import { generatorHandlers } from './handlers/generatorHandlers';
import { Handlers } from './handlers/handlers';
import { state } from './handlers/handlerState';
import { queryHandlers } from './handlers/queryHandlers';

const log = rawLog.scope('UtilityProcess');

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
  ...generatorHandlers,
  ...exportHandlers
}; 

process.parentPort.on('message', ({ ports }) => {
  if (ports && ports.length > 0) {
    state.port = ports[0]
    log.info('RECEIVED PORT: ', state.port);
    init();
    state.port.start();
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

  state.port.postMessage(replyArgs);
}

function init() {
  ormConnection = new ORMConnection(platformInfo.appDbPath, false);
  ormConnection.connect();

  state.port.on('message',  ({ data }) => {
    const { id, name, args } = data;
    runHandler(id, name, args);
  })
}
