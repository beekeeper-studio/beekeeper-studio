import { MessagePortMain } from 'electron';
import rawLog from 'electron-log'
import ORMConnection from '@/common/appdb/Connection'
import platformInfo from '@/common/platform_info';
import { AppDbHandlers } from '@/handlers/appDbHandlers';
import { ConnHandlers } from '../backend/handlers/connHandlers';
import { FileHandlers } from '@/handlers/fileHandlers';
import { GeneratorHandlers } from '@/handlers/generatorHandlers';
import { Handlers } from '../backend/handlers/handlers';
import { newState, removeState, state } from '@/handlers/handlerState';
import { QueryHandlers } from '@/handlers/queryHandlers';
import { ExportHandlers } from '@commercial/backend/handlers/exportHandlers';
import { BackupHandlers } from '@commercial/backend/handlers/backupHandlers';
import { EnumHandlers } from '@commercial/backend/handlers/enumHandlers';
import { TempHandlers } from '@/handlers/tempHandlers';
import { DevHandlers } from '@/handlers/devHandlers';
import { LicenseHandlers } from '@/handlers/licenseHandlers';

const log = rawLog.scope('UtilityProcess');

let ormConnection: ORMConnection;

interface Reply {
  id: string,
  type: 'reply' | 'error',
  data?: any,
  error?: string
  stack?: string
}

export let handlers: Handlers = {
  ...ConnHandlers,
  ...QueryHandlers,
  ...GeneratorHandlers,
  ...ExportHandlers,
  ...AppDbHandlers,
  ...BackupHandlers,
  ...FileHandlers,
  ...EnumHandlers,
  ...TempHandlers,
  ...LicenseHandlers,
  ...(platformInfo.isDevelopment && DevHandlers),
};

process.parentPort.on('message', async ({ data, ports }) => {
  const { type, sId } = data;
  switch (type) {
    case 'init':
      if (ports && ports.length > 0) {
        log.info('RECEIVED PORT: ', ports[0]);
        await initState(sId, ports[0]);
      } else {
        await init();
      }
      break;
    case 'close':
      log.info('REMOVING STATE FOR: ', sId);
      state(sId).port.close();
      removeState(sId);
      break;
    default:
      log.error('UNRECOGNIZED MESSAGE TYPE RECEIVED FROM MAIN PROCESS');
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
      replyArgs.stack = e?.stack
      replyArgs.error = e?.message ?? e
    }
  } else {
    replyArgs.type = 'error';
    replyArgs.error = `Invalid handler name: ${name}`;
  }

  state(args.sId).port.postMessage(replyArgs);
}

async function initState(sId: string, port: MessagePortMain) {
  newState(sId);

  state(sId).port = port;

  state(sId).port.on('message', ({ data }) => {
    const { id, name, args } = data;
    runHandler(id, name, args);
  })

  state(sId).port.start();
}

async function init() {
  ormConnection = new ORMConnection(platformInfo.appDbPath, false);
  await ormConnection.connect();

  process.parentPort.postMessage({ type: 'ready' });
}
