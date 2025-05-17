// Setup dynamic import of SQLAnywhere for M1/M2 Mac compatibility
// This code runs before any module can try to import sqlAnywhere
if (process.platform === 'darwin' && process.arch === 'arm64') {
  process.env.NODE_SKIP_PLATFORM_CHECK = "1";  // Allow Node.js to load incompatible modules
  console.warn('Running on Mac ARM64: SQLAnywhere module may not be fully compatible');
}

import rawLog from '@bksLogger';
rawLog.info("initializing utility");

const log = rawLog.scope('UtilityProcess');

import ORMConnection from '@/common/appdb/Connection';
import platformInfo from '@/common/platform_info';
import { AppDbHandlers } from '@/handlers/appDbHandlers';
import { DevHandlers } from '@/handlers/devHandlers';
import { FileHandlers } from '@/handlers/fileHandlers';
import { GeneratorHandlers } from '@/handlers/generatorHandlers';
import { newState, removeState, state } from '@/handlers/handlerState';
import { LicenseHandlers } from '@/handlers/licenseHandlers';
import { QueryHandlers } from '@/handlers/queryHandlers';
import { TabHistoryHandlers } from '@/handlers/tabHistoryHandlers';
import { TempHandlers } from '@/handlers/tempHandlers';
import { ThemeHandlers } from '@/handlers/themeHandlers';
import { BackupHandlers } from '@commercial/backend/handlers/backupHandlers';
import { EnumHandlers } from '@commercial/backend/handlers/enumHandlers';
import { ExportHandlers } from '@commercial/backend/handlers/exportHandlers';
import { ImportHandlers } from '@commercial/backend/handlers/importHandlers';
import { MessagePortMain } from 'electron';
import _ from 'lodash';
import { ConnHandlers } from '../backend/handlers/connHandlers';
import { Handlers } from '../backend/handlers/handlers';

import * as sms from 'source-map-support';

if (platformInfo.env.development || platformInfo.env.test) {
  sms.install()
}

let ormConnection: ORMConnection;

interface Reply {
  id: string,
  type: 'reply' | 'error',
  data?: any,
  error?: string
  stack?: string
}

export const handlers: Handlers = {
  ...ConnHandlers,
  ...QueryHandlers,
  ...GeneratorHandlers,
  ...ExportHandlers,
  ...ImportHandlers,
  ...AppDbHandlers,
  ...BackupHandlers,
  ...FileHandlers,
  ...EnumHandlers,
  ...TempHandlers,
  ...LicenseHandlers,
  ...TabHistoryHandlers,
  ...ThemeHandlers,
  ...(platformInfo.isDevelopment && DevHandlers),
};

_.mixin({
  'deepMapKeys': function (obj, fn) {

    const x = {};

    _.forOwn(obj, function (rawV, k) {
      let v = rawV
      if (_.isPlainObject(v)) {
        v = _.deepMapKeys(v, fn);
      } else if (_.isArray(v)) {
        v = v.map((item) => _.deepMapKeys(item, fn))
      }
      x[fn(v, k)] = v;
    });

    return x;
  }
});

process.on('uncaughtException', (error) => {
  log.error(error);
});

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
  const replyArgs: Reply = {
    id,
    type: 'reply',
  };

  if (handlers[name]) {
    return handlers[name](args)
      .then((data) => {
        replyArgs.data = data;
      })
      .catch((e) => {
        replyArgs.type = 'error';
        replyArgs.stack = e?.stack;
        replyArgs.error = e?.message ?? e;
        log.error("HANDLER: ERROR", e)
      })
      .finally(() => {
        try {
          state(args.sId).port.postMessage(replyArgs);
        } catch (e) {
          log.error('ERROR SENDING MESSAGE: ', replyArgs, '\n\n\n ERROR: ', e)
        }
      });
  } else {
    replyArgs.type = 'error';
    replyArgs.error = `Invalid handler name: ${name}`;

    try {
      state(args.sId).port.postMessage(replyArgs);
    } catch (e) {
      log.error('ERROR SENDING MESSAGE: ', replyArgs, '\n\n\n ERROR: ', e)
    }
  }
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
