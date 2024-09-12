import JSONImporter from "./formats/json"
import JSONLineImporter from "./formats/jsonline"
import CSVImporter from "./formats/csv"
import XSLXImporter from "./formats/xslx"

export function getImporterClass (importOptions, connection, table) {
  console.log(importOptions)
  const ImporterClass = {
    json: JSONImporter,
    csv: CSVImporter,
    xlsx: XSLXImporter,
    jsonl: JSONLineImporter
  }

  return new ImporterClass[importOptions.fileType](importOptions.fileName, importOptions, connection, table)
}