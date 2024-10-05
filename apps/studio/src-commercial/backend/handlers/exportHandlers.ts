import { TableFilter, TableOrView } from "@/lib/db/models";
import { CsvExporter, Export, JsonExporter, JsonLineExporter, SqlExporter } from "@/lib/export";
import { ExportStatus } from "@/lib/export/models";
import { checkConnection, errorMessages, state } from "@/handlers/handlerState";
import { TransportExport } from "@/common/transport/TransportExport";

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
  managerNotify: boolean
}

const ExportClassPicker = {
  'csv': CsvExporter,
  'json': JsonExporter,
  'sql': SqlExporter,
  'jsonl': JsonLineExporter
}

function getExporter(id: string, sId: string): Export {
  const exporter = state(sId).exports.get(id);

  if (!exporter) {
    throw new Error(errorMessages.noExport);
  }

  return exporter;
}

export interface IExportHandlers {
  'export/add': ({ options, sId }: { options: StartExportOptions, sId: string }) => Promise<TransportExport>,
  'export/remove': ({ id, sId }: { id: string, sId: string }) => Promise<void>,
  'export/removeInactive': ({ sId }: { sId: string }) => Promise<TransportExport[]>,
  'export/status': ({ id, sId }: { id: string, sId: string }) => Promise<ExportStatus>,
  'export/error': ({ id, sId }: { id: string, sId: string }) => Promise<Error>,
  'export/name': ({ id, sId }: { id: string, sId: string }) => Promise<string>,
  'export/start': ({ id, sId }: { id: string, sId: string }) => Promise<void>,
  'export/cancel': ({ id, sId }: { id: string, sId: string }) => Promise<void>,
  'export/batch': ({ ids, sId }: { ids: string[], sId: string }) => Promise<void>
}

export const ExportHandlers: IExportHandlers = {
  'export/add': async function({ options, sId }: { options: StartExportOptions, sId: string }) {
    checkConnection(sId);
    const exporter = new ExportClassPicker[options.exporter](
      options.filePath,
      state(sId).connection,
      options.table,
      options.query,
      options.queryName,
      options.filters || [],
      options.options,
      options.outputOptions,
      options.managerNotify
    );
    state(sId).exports.set(exporter.id, exporter);

    return {
      id: exporter.id,
      status: exporter.status,
      filePath: exporter.filePath,
      percentComplete: exporter.percentComplete
    };
  },

  'export/remove': async function({ id, sId }: { id: string, sId: string }) {
    state(sId).exports.delete(id);
  },

  'export/removeInactive': async function({ sId }: { sId: string}) {
    state(sId).exports = new Map([...state(sId).exports.entries()].filter(([_key, exp]) => exp.status === ExportStatus.Exporting));
    return [...state(sId).exports.entries()].map((value) => {
      return {
        id: value[0],
        status: value[1].status,
        filePath: value[1].filePath,
        percentComplete: value[1].percentComplete
      }
    });
  },

  'export/status': async function({ id, sId }: { id: string, sId: string }) {
    const exporter = getExporter(id, sId);
    return exporter.status;
  },

  'export/error': async function({ id, sId }: { id: string, sId: string }) {
    const exporter = getExporter(id, sId);
    return exporter.error;
  },

  'export/name': async function({ id, sId }: { id: string, sId: string }) {
    const exporter = getExporter(id, sId);

    return exporter.table ? exporter.table.name : exporter.queryName;
  },

  'export/start': async function({ id, sId }: { id: string, sId: string }) {
    const exporter = getExporter(id, sId);

    exporter.onProgress((progress) => {
      state(sId).port.postMessage({
        type: `onExportProgress/${id}`,
        input: progress
      })
    })

    await exporter.exportToFile()
  },

  'export/cancel': async function({ id, sId }: { id: string, sId: string }) {
    const exporter = getExporter(id, sId);

    return exporter.abort();
  },
  'export/batch': async function({ ids, sId }: { ids: string[], sId: string }) {
    await Promise.all(ids.map((id) => {
      const exporter = getExporter(id, sId);

      exporter.onProgress((progress) => {
        state(sId).port.postMessage({
          type: `onExportProgress/${id}`,
          input: progress
        })
      })

      return exporter.exportToFile();
    }));
  }
}
