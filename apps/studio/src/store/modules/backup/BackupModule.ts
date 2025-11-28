import { BackupConfig } from "@/lib/db/models/BackupConfig";
import { Notification, BaseCommandClient } from "@/lib/db/BaseCommandClient";
import { SupportedBackupFeatures, TableOrView, BackupSchema, BackupTable } from "@/lib/db/models";
import { Module } from "vuex";
import { State as RootState } from '../../index'
import { commandClientsFor } from "@/lib/db/CommandClient";
import Noty from 'noty';

function getCommandClient(state: State) {
  return state.isRestore ? state.restoreClient : state.backupClient;
}

interface State {
  backupClient: BaseCommandClient,
  restoreClient: BaseCommandClient,
  // TODO (@day): these may need to be removed somehow,
  backupTables: BackupTable[],
  backupSchemata: BackupSchema[],
  logMessages: string[],
  commandStart: Date,
  commandEnd: Date,
  isRestore: boolean,
  failed: boolean
}

export const BackupModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    backupClient: null,
    restoreClient: null,
    backupTables: [],
    backupSchemata: [],
    logMessages: [],
    commandStart: null,
    commandEnd: null,
    isRestore: null,
    failed: false
  }),
  getters: {
    backupConfig(state): Partial<BackupConfig> | undefined {
      return getCommandClient(state).config
    },
    supportedFeatures(state): SupportedBackupFeatures {
      return getCommandClient(state).supportedFeatures();
    },
    settingsConfig(state) {
      return getCommandClient(state).settingsConfig;
    },
    settingsSections(state) {
      return getCommandClient(state).settingsSections;
    },
    commandClient(state) {
      return getCommandClient(state)
    },
    isRestore(state) {
      return state.isRestore;
    },
    logFilePath(state) {
      return getCommandClient(state).logPath;
    }
  },
  mutations: {
    setBackupClient(state, backupClient: BaseCommandClient) {
      state.backupClient = backupClient;
    },
    setRestoreClient(state, restoreClient: BaseCommandClient) {
      state.restoreClient = restoreClient;
    },
    setClientSupportedFeatures(state, features) {
      getCommandClient(state).connSupportedFeatures = features;
    },
    setClientConnectionConfig(state, config) {
      getCommandClient(state).connConfig = config;
    },
    setClientServerConfig(state, config) {
      getCommandClient(state).serverConfig = config;
    },
    setTables(state, tables: BackupTable[]) {
      state.backupTables = tables;
    },
    setIncludedTables(state, tables: TableOrView[]) {
      state.backupTables.forEach((table: BackupTable) => table.included = tables.some((x) => x.name === table.objectName && x.schema === table.schemaName));
    },
    setIncludedSchemata(state, schemata: string[]) {
      state.backupSchemata.forEach((schema: BackupSchema) => schema.included = schemata.some((x) => x === schema.objectName));
    },
    setSchemata(state, schemata: BackupSchema[]) {
      state.backupSchemata = schemata;
    },
    updateConfig(state, update: Partial<BackupConfig>) {
      getCommandClient(state).config = update;
    },
    setDatabase(state, database: string) {
      getCommandClient(state).database = database;
    },
    addLogMessage(state, message: string) {
      state.logMessages.push(message);
      getCommandClient(state).writeToLog(message);
      if (state.logMessages.length > 150) {
        state.logMessages.shift();
      }
    },
    setStartDate(state, start: Date) {
      state.commandStart = start;
    },
    setEndDate(state, end: Date) {
      state.commandEnd = end;
    },
    clearLog(state) {
      state.logMessages = [];
      getCommandClient(state).resetLogFile();
    },
    setMode(state, isRestore: boolean) {
      state.isRestore = isRestore;
    },
    setFailed(state, failed: boolean) {
      state.failed = failed;
    }
  },
  actions: {
    reset(context, resetConfig = true) {
      if (resetConfig) {
        context.commit('updateConfig', null);
      }
      context.commit('clearLog');
      context.commit('setStartDate', null);
      context.commit('setEndDate', null);
      context.commit('setFailed', false);
    },
    async findDumpTool(context) {
      await context.getters.commandClient.findDumpTool();
    },
    setConnectionConfigs(context, {config, supportedFeatures, serverConfig}) {
      const clients = commandClientsFor(config.connectionType)

      const notifCallback = (notif: Notification) => {
        new Noty({
          text: notif.text,
          layout: 'bottomRight',
          timeout: 2000,
          type: notif.type
        }).show();
      };

      // set callback for notifications
      clients.backup.notificationCallback = notifCallback;
      clients.restore.notificationCallback = notifCallback;

      context.commit('setBackupClient', clients.backup);
      context.commit('setRestoreClient', clients.restore);

      context.commit('setClientSupportedFeatures', supportedFeatures);
      context.commit('setClientConnectionConfig', config);
      context.commit('setClientServerConfig', serverConfig);
    },
    async execute(context) {
      context.commit('clearLog');
      // Set the start date for the backup and add the starting log message.
      const start = new Date();
      context.commit('setStartDate', start);

      // Set up temp file for full logs
      context.getters.commandClient.initLogFile();

      // Set callback so logs are added to the store.
      context.getters.commandClient.addLogCallback = (log: string) => {
        context.commit('addLogMessage', log);
      }

      // Run the client command.
      await context.getters.commandClient.runCommand().catch(() => context.commit('setFailed', true));

      // get the end date, add the end time to log, and get the total time elapsed.
      const end = new Date();
      context.commit('setEndDate', end);
    },
    async cancel(context) {
      await context.getters.commandClient.cancelCommand();
      context.dispatch('reset');
    },
    loadTables(context, tables: TableOrView[]) {
      // HACK (day): Not sure if this is how we want to filter them out, this is just quick n dirty
      // const exclude = ['pg_catalog', 'information_schema']
      const exclude = [];
      const backupTables = tables
        .filter((t) => !exclude.includes(t.schema))
        .map((t: TableOrView) => {
          return new BackupTable({
            objectName: t.name,
            schemaName: t.schema,
            included: false
          });
        });
      context.commit('setTables', backupTables);
    },
    loadSchemata(context, schemata: string[]) {
      // HACK (day): Not sure if this is how we want to filter them out, this is just quick n dirty
      // const exclude = ['pg_catalog', 'information_schema']
      const exclude = [];
      const backupSchemata = schemata
        .filter((s) => !exclude.includes(s))
        .map((s) => {
          return new BackupSchema({
            objectName: s,
            included: false
          });
        });
      context.commit('setSchemata', backupSchemata);
    },
    setObjectsIncluded(context, { tables, schemata }) {
      context.commit('setIncludedTables', tables);
      // process schemata
      if (schemata && schemata.length > 0) {
        // filter out schemata that aren't selected anymore
        schemata = schemata.filter((schema: string) => context.state.backupTables.some((table: BackupTable) => schema === table.schemaName && table.included));
        context.commit('setIncludedSchemata', schemata);
      }
    },
    processObjects(context) {
      const includeSchemata = context.state.backupSchemata.filter((s) => s.included).map((s) => s.objectName);
      const includeTables = context.state.backupTables
        .filter((t) => t.included && !includeSchemata.includes(t.schemaName))
        .map((t) => `${t.schemaName ? t.schemaName + '.' : ''}${t.objectName}`);
      const excludeTables = context.state.backupTables
        .filter((t) => !t.included && includeSchemata.includes(t.schemaName))
        .map((t) => `${t.schemaName ? t.schemaName + '.' : ''}${t.objectName}`);
      context.commit('updateConfig', {
        includeTables,
        excludeTables,
        includeSchemata
      });
    },
    deleteLogFile(context) {
      getCommandClient(context.state).deleteLogFile();
    }
  }
}
