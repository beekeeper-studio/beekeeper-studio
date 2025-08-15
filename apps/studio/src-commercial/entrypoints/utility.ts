import rawLog from '@bksLogger';
rawLog.info("initializing utility");

const log = rawLog.scope('UtilityProcess');

import { MessagePortMain } from 'electron';
import ORMConnection from '@/common/appdb/Connection'
import platformInfo from '@/common/platform_info';
import { AppDbHandlers } from '@/handlers/appDbHandlers';
import { ConnHandlers } from '../backend/handlers/connHandlers';
import { FileHandlers } from '@/handlers/fileHandlers';
import { GeneratorHandlers } from '@/handlers/generatorHandlers';
import { Handlers } from '../backend/handlers/handlers';
import { newState, removeState, state } from '@/handlers/handlerState';
import { QueryHandlers } from '@/handlers/queryHandlers';
import { TabHistoryHandlers } from '@/handlers/tabHistoryHandlers'
import { ExportHandlers } from '@commercial/backend/handlers/exportHandlers';
import { BackupHandlers } from '@commercial/backend/handlers/backupHandlers';
import { ImportHandlers } from '@commercial/backend/handlers/importHandlers';
import { EnumHandlers } from '@commercial/backend/handlers/enumHandlers';
import { TempHandlers } from '@/handlers/tempHandlers';
import { DevHandlers } from '@/handlers/devHandlers';
import { LicenseHandlers } from '@/handlers/licenseHandlers';
import { LockHandlers } from '@/handlers/lockHandlers';
import { PluginHandlers } from '@/handlers/pluginHandlers';
import { PluginManager, PluginSettings } from '@/services/plugin';
import _ from 'lodash';

import * as sms from 'source-map-support'
import { UserSetting } from '@/common/appdb/models/user_setting';
import PluginFileManager from '@/services/plugin/PluginFileManager';
import bksConfig from "@/common/bksConfig";

if (platformInfo.env.development || platformInfo.env.test) {
  sms.install()
}

let ormConnection: ORMConnection;
const pluginManager = new PluginManager({
  onPluginSettingsChange: handleSetPluginSettings,
  appVersion: platformInfo.appVersion,
  fileManager: new PluginFileManager({
    pluginsDirectory: platformInfo.pluginsDirectory,
  }),
  installDefaults: bksConfig.plugins.installDefaults,
});

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
  ...PluginHandlers(pluginManager),
  ...TabHistoryHandlers,
  ...LockHandlers,
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

const pluginSettingsKey = 'pluginSettings';

async function handleSetPluginSettings(pluginSettings: PluginSettings) {
  await UserSetting.set(pluginSettingsKey, JSON.stringify(pluginSettings));
  log.debug(`Saved plugin settings.`);
}

/** Loads the list of disabled auto-update plugins from the database.
 * @todo all plugin settings should be loaded and saved from the config files
 */
async function loadPluginSettings(): Promise<PluginSettings> {
  const setting = await UserSetting.get(pluginSettingsKey);
  if (setting && setting.value) {
    const pluginSettings = setting.value as PluginSettings;
    log.debug(
      `Loaded plugin settings: ${JSON.stringify(pluginSettings)}`
    );
    return pluginSettings;
  }
  return {};
}

async function init() {
  ormConnection = new ORMConnection(platformInfo.appDbPath, false);
  await ormConnection.connect();

  try {
    const pluginSettings = await loadPluginSettings();
    await pluginManager.initialize({ pluginSettings });
    for (const pluginId of bksConfig.plugins.general.preinstalled) {
      if (!pluginSettings[pluginId]) {
        pluginManager.installPlugin(pluginId).catch((e) => log.error(e));
      }
    }
  } catch (e) {
    log.error("Error initializing plugin manager", e);
  }

  process.parentPort.postMessage({ type: 'ready' });
}
