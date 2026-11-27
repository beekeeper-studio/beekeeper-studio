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
import { context } from '@/handlers/handlerContext';
import { QueryHandlers } from '@/handlers/queryHandlers';
import { TabHistoryHandlers } from '@/handlers/tabHistoryHandlers'
import { ExportHandlers } from '@commercial/backend/handlers/exportHandlers';
import { BackupHandlers } from '@commercial/backend/handlers/backupHandlers';
import { CliHandlers } from '@commercial/backend/handlers/cliHandlers';
import { CliServerHandlers } from '@/handlers/cliServerHandlers';
import { AwsHandlers } from '@commercial/backend/handlers/awsHandlers';
import { ImportHandlers } from '@commercial/backend/handlers/importHandlers';
import { EnumHandlers } from '@commercial/backend/handlers/enumHandlers';
import { ThemeHandlers } from '@/handlers/themeHandlers';
import { TempHandlers } from '@/handlers/tempHandlers';
import { DevHandlers } from '@/handlers/devHandlers';
import { FormatterPresetHandlers } from '@/handlers/formatterPresetHandlers';
import { LicenseHandlers } from '@/handlers/licenseHandlers';
import { LockHandlers } from '@/handlers/lockHandlers';
import { PluginHandlers } from '@/handlers/pluginHandlers';
import { PluginManager } from '@/services/plugin';
import ExtensionFileManager from '@/services/extension/ExtensionFileManager';
import { DriverDepHandlers } from '@/handlers/driverDepHandlers';
import { DriverDepManager, DriverDepFileManager, createDefaultRegistry } from '@/services/driverDeps';
import type { DepPlatform, DepArch } from '@/services/driverDeps';
import BksConfig from '@/common/bksConfig';
import _ from 'lodash';
import {
  ConfigurationModule,
  BundledPluginModule,
  RegistryModule,
  LicenseModule,
} from '@/services/plugin/modules';
import { ExtensionRegistryErrorCode, ExtensionRepositoryErrorCode, PluginErrorCode, PluginSystemErrorCode, ThemeSystemErrorCode } from '@/lib/errors';
import {
  RpcClient,
  RpcServer,
  SocketServerPort,
  SocketServerPortError,
  type Request,
  Reply as RpcReply,
} from '@beekeeperstudio/rpc';

import * as sms from 'source-map-support'
import { WorkspaceHandlers } from '@/handlers/workspaceHandlers';
import { ConfigHandlers } from '@/handlers/configHandlers';
import { UtilityApi } from '@/services/UtilityApi';
import { CliAuditLog, createElectronLogSink } from '@/services/cliServer/auditLog';
import ExtensionRegistry from '@/services/extension/ExtensionRegistry';
import globals from '@/common/globals';
import { ThemeManager } from '@/services/theme/ThemeManager';
import { ThemeConfigurationModule } from '@/services/theme/modules/ThemeConfigurationModule';
import { ThemeAutoUpdateModule } from '@/services/theme/modules/ThemeAutoUpdateModule';
import { ThemeLicenseModule } from '@/services/theme/modules/ThemeLicenseModule';
import { ThemeFileChangedModule } from '@/services/theme/modules/ThemeFileChangedModule';

if (platformInfo.env.development || platformInfo.env.test) {
  sms.install()
}

let ormConnection: ORMConnection;

const driverDepManager = new DriverDepManager({
  fileManager: new DriverDepFileManager({
    driverDepsDirectory: platformInfo.driverDepsDirectory,
    userAgent: BksConfig.general.downloadUserAgent,
  }),
  registry: createDefaultRegistry(),
  platform: platformInfo.platform as DepPlatform,
  arch: (process.arch === 'x64' ? 'x64' : 'arm64') as DepArch,
});

// errorCode is omitted because these codes are not CliErrorCodes
interface Reply extends Omit<RpcReply, 'errorCode'> {
  errorName?: "PluginSystemError" | "PluginError" | "ExtensionRegistryError" | "ExtensionRepositoryError" | "ThemeSystemError" | "CancelError" | "Error"
  errorCode?: PluginSystemErrorCode | PluginErrorCode | ExtensionRegistryErrorCode | ExtensionRepositoryErrorCode | ThemeSystemErrorCode
}

export const handlers: Handlers = {
  ...ConnHandlers,
  ...QueryHandlers,
  ...GeneratorHandlers,
  ...ExportHandlers,
  ...ImportHandlers,
  ...AppDbHandlers,
  ...BackupHandlers,
  ...CliHandlers,
  ...CliServerHandlers,
  ...AwsHandlers,
  ...FileHandlers,
  ...EnumHandlers,
  ...ThemeHandlers,
  ...TempHandlers,
  ...LicenseHandlers,
  ...PluginHandlers,
  ...DriverDepHandlers(driverDepManager),
  ...TabHistoryHandlers,
  ...LockHandlers,
  ...FormatterPresetHandlers,
  ...WorkspaceHandlers,
  ...ConfigHandlers,
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
      await removeState(sId);
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
        replyArgs.errorName = e?.name;
        replyArgs.errorCode = e?.code;
        replyArgs.errorDetail = e?.detail
        replyArgs.errorHint = e?.hint
        log.error("HANDLER: ERROR", e)
      })
      .finally(() => {
        try {
          state(args.sId).port.postMessage(replyArgs);
        } catch (e) {
          log.error('ERROR SENDING MESSAGE: ', replyArgs, '\n\n\n ERROR: ', e?.message ?? e)
          replyArgs.type = 'error';
          replyArgs.stack = e?.stack;
          replyArgs.error = e?.message ?? 'Error sending message from utility process, this may be a bug. Please file an issue if this persists.'
          delete replyArgs.data
          state(args.sId).port.postMessage(replyArgs)
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
  state(sId).rendererClient = new RpcClient(port);

  state(sId).port.on('message', ({ data }: { data: Request }) => {
    // RpcClient handles these itself
    if ((data as { type?: string }).type === 'response') {
      return;
    }
    const { id, name, args } = data;
    runHandler(id, name, args);
  })

  state(sId).port.start();
}

async function init() {
  ormConnection = new ORMConnection(platformInfo.appDbPath, false);
  await ormConnection.connect();

  const pluginManager = new PluginManager({
    appVersion: platformInfo.appVersion,
    fileManager: new ExtensionFileManager({
      root: platformInfo.pluginsDirectory,
    }),
    registry: new ExtensionRegistry({ registries: globals.plugins.registries }),
  });
  pluginManager.registerModules([
    ConfigurationModule.with({ config: BksConfig }),
    RegistryModule.with({ config: BksConfig }),
    BundledPluginModule,
    LicenseModule,
  ]);

  const themeManager = new ThemeManager({
    fileManager: new ExtensionFileManager({
      root: platformInfo.themesDirectory,
    }),
  });
  themeManager.registerModules([
    ThemeConfigurationModule.with({ config: BksConfig }),
    ThemeAutoUpdateModule.with({ config: BksConfig }),
    ThemeLicenseModule,
    ThemeFileChangedModule,
  ]);

  const auditSink = createElectronLogSink(rawLog);
  const auditLog = new CliAuditLog(auditSink, (e) => log.warn('Could not write the CLI audit log', e));
  const cliSocket = new SocketServerPort({
    socketPath: platformInfo.cliSocketPath,
    logger: rawLog.scope("SocketServerPort"),
  });
  const cliServer = new RpcServer(cliSocket);
  cliServer.initialize();
  const utilityApi = new UtilityApi();
  for (const command of utilityApi.getCliApis()) {
    cliServer.register(command.name, command.func);
  }
  cliSocket.on("requestHandled", (event) => auditLog.record(event));

  context.utilityApi = utilityApi;
  context.pluginManager = pluginManager;
  context.themeManager = themeManager;
  context.cliSocket = cliSocket;

  pluginManager.initialize().catch((e) => {
    log.error("Error initializing plugin manager", e);
  });

  themeManager.initialize().catch((e) => {
    log.error("Error initializing theme manager", e);
  });

  driverDepManager.initialize().catch((e) => {
    log.error("Error initializing driver dep manager", e);
  });

  cliSocket
    .start()
    .then(() => {
      log.info(`CLI calls are recorded in ${auditSink.filePath() ?? 'cli.log'}`);
    })
    .catch((e) => {
      if (e instanceof SocketServerPortError) {
        if (e.code === SocketServerPortError.SocketPathNotProvided) {
          // we can ignore this error
          return;
        }
      }
      log.error('Failed to start the CLI socket server', e);
    });

  process.parentPort.postMessage({ type: 'ready' });
}

process.on('exit', () => {
  context.cliSocket?.stopSync();
});
