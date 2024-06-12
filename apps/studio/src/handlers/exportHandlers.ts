import { TableFilter, TableOrView } from "@/lib/db/models";
import { CsvExporter, Export, JsonExporter, JsonLineExporter, SqlExporter } from "@/lib/export";
import { ExportStatus } from "@/lib/export/models";
import { uuidv4 } from "@/lib/uuid";
import { checkConnection, errorMessages, state } from "./handlerState";
import rawLog from 'electron-log';

const log = rawLog.scope('ExportHandler');

interface StartExportOptions {
  table: TableOrView,
  query?: string,
  queryName?: string,
  filters: TableFilter[],
  exporter: 'csv' | 'json' | 'sql' | 'jsonl'
  filePath: string
  options: {
    chunkSize: number
    deleteOnAbort: boolean
    includeFilter: boolean
  }
  outputOptions: any
}

const ExportClassPicker = {
  'csv': CsvExporter,
  'json': JsonExporter,
  'sql': SqlExporter,
  'jsonl': JsonLineExporter
}

function getExporter(id: string): Export {
  const exporter = state.exports.get(id);

  if (!exporter) {
    throw new Error(errorMessages.noExport);
  }

  return exporter;
}

export interface IExportHandlers {
  'export/add': ({ options }: { options: StartExportOptions}) => Promise<string>,
  'export/remove': ({ id }: { id: string }) => Promise<void>,
  'export/removeInactive': () => Promise<string[]>,
  'export/status': ({ id }: { id: string }) => Promise<ExportStatus>,
  'export/error': ({ id }: { id: string }) => Promise<Error>,
  'export/name': ({ id }: { id: string }) => Promise<string>,
  'export/start': ({ id }: { id: string }) => Promise<void>,
  'export/cancel': ({ id }: { id: string }) => Promise<void>
}

export const ExportHandlers: IExportHandlers = {
  'export/add': async function({ options }: { options: StartExportOptions }) {
    checkConnection();
    const exporter = new ExportClassPicker[options.exporter](
      options.filePath,
      state.connection,
      options.table,
      options.query,
      options.queryName,
      options.filters || [],
      options.options,
      options.outputOptions
    );
    // maybe just use the id from the export??
    const id = uuidv4();
    state.exports.set(id, exporter);

    return id;
  },

  'export/remove': async function({ id }: { id: string }) {
    state.exports.delete(id);
  },

  'export/removeInactive': async function() {
    state.exports = new Map([...state.exports.entries()].filter(([_key, exp]) => exp.status === ExportStatus.Exporting));
    return [...state.exports.keys()];
  },

  'export/status': async function({ id }: { id: string }) {
    const exporter = getExporter(id);
    return exporter.status;
  },

  'export/error': async function({ id }: { id: string }) {
    const exporter = getExporter(id);
    return exporter.error;
  },

  'export/name': async function({ id }: { id: string }) {
    const exporter = getExporter(id);

    return exporter.table ? exporter.table.name : exporter.queryName;
  },

  'export/start': async function({ id }: { id: string }) {
    const exporter = getExporter(id);

    // TODO (@day): need to add on progress, send message back to renderer with progress info?

    exporter.onProgress((progress) => {
      log.info('onProgress proc')
      state.port.postMessage({
        type: `onExportProgress/${id}`,
        input: progress
      })
    })

    await exporter.exportToFile()
  },

  'export/cancel': async function({ id }: { id: string }) {
    const exporter = getExporter(id);

    return exporter.abort();
  }
}
