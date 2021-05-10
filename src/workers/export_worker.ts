/* eslint-disable */

import { expose } from 'threads'
import { IDbConnectionServerConfig } from "../lib/db/client";
import { TableFilter, TableOrView } from "../lib/db/models";
import { ExportOptions, ExportProgress } from "../lib/export/models";
import { createServer } from "../lib/db";
import { Exporter, ExportType } from "../lib/export/index";
import { Observable } from 'observable-fns'
import { Export } from "../lib/export/export";
import rawLog from 'electron-log'


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




const log = rawLog.scope('export_worker')

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
  test: () => {
    log.info("Export Worker here!")
  },
  export: (options: WorkerOptions): Observable<ExportProgress> => {
    log.info('export worker begins!', options)

    
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