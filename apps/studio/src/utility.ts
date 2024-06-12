import rawLog from 'electron-log'
import ORMConnection from './common/appdb/Connection'
import platformInfo from './common/platform_info';
import { ConnHandlers } from './handlers/connHandlers';
import { ExportHandlers } from './handlers/exportHandlers';
import { GeneratorHandlers } from './handlers/generatorHandlers';
import { Handlers } from './handlers/handlers';
import { state } from './handlers/handlerState';
import { QueryHandlers } from './handlers/queryHandlers';

const log = rawLog.scope('UtilityProcess');

let ormConnection: ORMConnection;

interface Reply {
  id: string,
  type: 'reply' | 'error',
  data?: any,
  error?: string
}

export let handlers: Handlers = {
  ...ConnHandlers,
  ...QueryHandlers,
  ...GeneratorHandlers,
  ...ExportHandlers
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
