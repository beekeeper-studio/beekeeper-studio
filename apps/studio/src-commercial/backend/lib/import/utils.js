import JSONImporter from "./formats/json"
import JSONLineImporter from "./formats/jsonline"
import CSVImporter from "./formats/csv"
import XLSXImporter from "./formats/xlsx"

export function getImporterClass (importOptions, connection, table) {
  const ImporterClass = {
    json: JSONImporter,
    csv: CSVImporter,
    xlsx: XLSXImporter,
    jsonl: JSONLineImporter
  }

  return new ImporterClass[importOptions.fileType](importOptions.fileName, importOptions, connection, importOptions.table)
}
