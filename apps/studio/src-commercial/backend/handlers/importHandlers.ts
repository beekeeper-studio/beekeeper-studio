import { TableColumn } from "@/lib/db/models";
import ImportClass from '@/lib/import'
import { getImporterClass } from '@commercial/backend/lib/import/utils'
import { ImportOptions } from '@commercial/backend/lib/import/models'
import { checkConnection, errorMessages, state } from "@/handlers/handlerState"
import rawLog from '@bksLogger';
import { uuidv4 } from "@/lib/uuid";

const log = rawLog.scope('ImportHandler');

function getImporter(id: string, sId: string): ImportClass {
  const importer = state(sId).imports.get(id);

  if (!importer) {
    throw new Error(errorMessages.noImport);
  }

  return importer;
}

interface PreviewData {
  data: any[]
  columns: TableColumn[]
}

export interface IImportHandlers {
  'import/init': ({ sId, options }: { sId: string, options: ImportOptions }) => Promise<string>,
  'import/allowChangeSettings': ({ sId, id }: { sId: string, id: string }) => Promise<any>,
  'import/excel/getSheets': ({ sId, id }: { sId: string, id: string }) => Promise<any>,
  'import/setOptions': ({ sId, id, options }: { sId: string, id: string, options: ImportOptions }) => Promise<any>,
  'import/getFilePreview': ({ sId, id }: { sId: string, id: string }) => Promise<PreviewData>,
  'import/getImportPreview': ({ sId, id }: { sId: string, id: string }) => Promise<any>,
  'import/getFileAttributes': ({ sId, id }: { sId: string, id: string }) => Promise<any>,
  'import/getAutodetectedSettings': ({ sId, id }: { sId: string, id: string }) => Promise<any>,
  'import/mapper': ({ sId, id, dataToMap }: { sId: string, id: string, dataToMap: any[] }) => Promise<any>,
  'import/importFile': ({ sId, id }: { sId: string, id: string }) => Promise<any>
}

export const ImportHandlers: IImportHandlers = {
  'import/init': async function({ sId, options }: { sId: string, options: ImportOptions }) {
    checkConnection(sId)
    const importer: any = getImporterClass(options, state(sId).connection);
    const processId = uuidv4();

    log.debug(`Initializing import class at id: ${processId}`)
    state(sId).imports.set(processId, importer);

    return processId;
  },

  'import/allowChangeSettings': async function({ sId, id }: {sId: string, id: string}) {
    const importer = getImporter(id, sId)
    return importer.allowChangeSettings()
  },

  'import/excel/getSheets': async function({ sId, id }: {sId: string, id: string}) {
    const importer = getImporter(id, sId)
    return await importer.getSheets()
  },

  'import/setOptions': async function({ sId, options, id }: { options: ImportOptions, sId: string, id: string}) {
    const importer = getImporter(id, sId)
    return importer.setOptions(options)
  },
  
  'import/getFilePreview': async function({ sId, id }: { sId: string, id: string}) {
    const importer = getImporter(id, sId)
    const previewData: any = await importer.getPreview()

    return importer.mapRawData(previewData)
  },

  'import/getImportPreview': async function({ sId, id }: { sId: string, id: string}) {
    const importer = getImporter(id, sId)
    const { data }: any = await importer.getPreview()

    return importer.mapData(data)
  },

  'import/getFileAttributes': async function({ sId, id }: { sId: string, id: string}) {
    const importer = getImporter(id, sId)
    // eslint was getting all uppity about preview data possibly being void since the extended classes actually do something
    // with the getPreview class
    return await importer.getPreview()
  },

  'import/getAutodetectedSettings': async function({ sId, id }: { sId: string, id: string }) {
    const importer = getImporter(id, sId)
    return importer.autodetectedSettings()
  },

  'import/mapper': async function({ sId, id, dataToMap }: { options: any, sId: string, id: string, dataToMap: any[] }) {
    const importer = getImporter(id, sId)
    return importer.mapper(dataToMap)
  },

  'import/importFile': async function({ sId, id }: { options: any, sId: string, id: string}) {
    const importer = getImporter(id, sId)
    return await importer.importFile()
  }
}
