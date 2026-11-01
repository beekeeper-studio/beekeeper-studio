import { IConnection } from "@/common/interfaces/IConnection";
import { CloudClient } from "@/lib/cloud/CloudClient";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { CancelableQuery } from "@/lib/db/models";
import { IDbConnectionPublicServer } from "@/lib/db/serverTypes";
import { Export } from "@/lib/export";
import ImportClass from "@/lib/import"
import { PluginManager } from "@/services/plugin";
import { SqlGenerator } from "@shared/lib/sql/SqlGenerator";
import { ChildProcessWithoutNullStreams } from "child_process";
import { MessagePortMain } from "electron";
import { FSWatcher } from "chokidar";
import fs from "fs";
import tmp from 'tmp';
import platformInfo from '@/common/platform_info';
import BksConfig from '@/common/bksConfig';
import FileManager from '@/services/plugin/FileManager';
import { ThemeManager } from '@commercial/backend/lib/theme/ThemeManager';
import {
  ConfigurationModule,
  BundledPluginModule,
  RegistryModule,
  LicenseModule,
} from '@commercial/backend/plugin-system/modules';

export interface TempFile {
  fileObject: tmp.FileResult,
  fileHandle: fs.promises.FileHandle
}

class State {
  port: MessagePortMain = null
  server: IDbConnectionPublicServer = null;
  usedConfig: IConnection = null;
  connection: BasicDatabaseClient<any, any> = null;
  transactionTimeouts: Map<number, NodeJS.Timeout> = new Map();
  database: string = null;
  username: string = null;
  queries: Map<string, CancelableQuery> = new Map();
  generator: SqlGenerator = null;
  exports: Map<string, Export> = new Map();
  imports: Map<string, ImportClass> = new Map();
  backupProc: ChildProcessWithoutNullStreams = null;

  cloudClient: CloudClient = null;
  workspaceId: number = null;

  connectionAbortController: AbortController = null;

  // enums
  enumsInitialized = false;

  private enumWatcher: fs.FSWatcher = null;

  set watcher(value: fs.FSWatcher) {
    if (this.enumWatcher != null) this.enumWatcher.close();
    this.enumWatcher = value;
  }

  themeWatcher: FSWatcher = null;

  // temp files
  tempFiles: Map<string, TempFile> = new Map();
}

const states = new Map<string, State>();

export const pluginManager = new PluginManager({
  appVersion: platformInfo.appVersion,
  fileManager: new FileManager({
    root: platformInfo.pluginsDirectory,
  }),
});
pluginManager.registerModule(ConfigurationModule.with({ config: BksConfig }));
pluginManager.registerModule(RegistryModule.with({ config: BksConfig }));
pluginManager.registerModule(BundledPluginModule);
pluginManager.registerModule(LicenseModule);

export const themeManager = new ThemeManager({
  fileManager: new FileManager({ root: platformInfo.themesDirectory })
});

// I kinda hate this tbh. modifying could be scary
export function state(id: string): State {
  return states.get(id);
}

export function newState(id: string): void {
  states.set(id, new State());
}

export async function removeState(id: string): Promise<void> {
  const state = states.get(id);
  if (!state) return;
  for (const file of state.tempFiles.values()) {
    if (file.fileHandle) {
      await file.fileHandle.close().catch();
    }

    if (file.fileObject) {
      try {
        file.fileObject.removeCallback()
      } catch {}
    }
  }
  state.tempFiles.clear();
  state.themeWatcher?.close();
  states.delete(id);
}

export const errorMessages = {
  noUsername: 'No username provided',
  noGenerator: 'No sql generator found',
  noDatabase: 'No database connection found',
  noServer: 'No server found',
  noQuery: 'Query not found',
  noExport: 'Export not found',
  noImport: 'Import not found'
};

export function getDriverHandler(name: string) {
  return async function({sId }: { sId: string }): Promise<any> {
    checkConnection(sId);
    return await state(sId).connection[name]();
  }
}

export function checkConnection(sId: string) {
  if (!state(sId).connection) {
    throw new Error(errorMessages.noDatabase);
  }
}

