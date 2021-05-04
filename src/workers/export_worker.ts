/* eslint-disable */

// hacks to work around dom needs in @azure libs
import { DOMParser, DOMImplementation, XMLSerializer } from "xmldom";

self.DOMParser = DOMParser;
self.XMLSerializer = XMLSerializer;

// @ts-ignore
self.document = {
  implementation: new DOMImplementation(),
};

// @ts-ignore
self.window = {
  navigator,
};


import { expose } from "threads/worker"
import { IDbConnectionServerConfig } from "../lib/db/client";
import { TableFilter, TableOrView } from "../lib/db/models";
import { ExportOptions, ExportProgress } from "../lib/export/models";
import { createServer } from "../lib/db";
import { Exporter, ExportType } from "../lib/export";
import { Observable } from 'observable-fns'
import { Export } from "../lib/export/export";


interface WorkerOptions {
  config: IDbConnectionServerConfig
  database: string | undefined
  exportType: ExportType
  exportConfig: {
    filePath: string
    table: TableOrView,
    filters: TableFilter[] | any[]
    options: ExportOptions,
    outputOptions: any
  }
}

let exporter: Export | undefined

const ExportWorker = {
  export: (options: WorkerOptions): Observable<ExportProgress> => {
    return new Observable((observer) => {
      (async () => {
        const server = createServer(options.config)
        const connection = server.createConnection(options.database)
        await connection.connect()

        exporter = (Exporter(options.exportType))(
          options.exportConfig.filePath,
          connection,
          options.exportConfig.table,
          options.exportConfig.filters,
          options.exportConfig.options,
          options.exportConfig.outputOptions
        )
        

        exporter?.onProgress((progress) => {
          observer.next(progress)
        })
        observer.complete()
        try {
          await exporter?.exportToFile()
        } catch (error: any) {
          observer.error(error)
        }
      })()

    })
  },
  cancel() {
    exporter?.abort()
  }
}

export type ExportWorker = typeof ExportWorker

expose(ExportWorker)