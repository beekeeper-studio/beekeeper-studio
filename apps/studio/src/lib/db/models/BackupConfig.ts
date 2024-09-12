import dateFormat from "dateformat";

export class BackupConfig {
  constructor({ outputPath }) {
    this.outputPath = outputPath
  }

  // FILEPICKER CONTROLS ----------------------------------------------------
  outputPath?: string;

  inputPath?: string;

  dumpToolPath?: string = null;

  dockerCliPath?: string = null;

  // END FILEPICKER CONTROLS ------------------------------------------------

  // TEXT INPUT CONTROLS ----------------------------------------------------
  filename?: string = dateFormat(new Date(), 'yyyy-mm-dd_HHMMss');

  encryptionCertificate?: string = null;

  encryptionKey?: string = null;

  dockerContainerName?: string = null

  createDatabaseName?: string = null;

  copyToFilePath?: string = null;
  // END TEXT INPUT CONTROLS ------------------------------------------------

  // TEXTAREA CONTROLS ------------------------------------------------------
  customArgs?: string = null;

  // END TEXTAREA CONTROLS --------------------------------------------------

  // SELECT CONTROLS --------------------------------------------------------
  format?: string = null;

  encryptionAlgorithm?: string = null;

  encryptorType?: string = null;

  compression?: string = null;

  toolName?: string = null;
  // END SELECT CONTROLS ----------------------------------------------------

  // CHECKBOX CONTROLS ------------------------------------------------------
  dataOnly = false;

  schemaOnly = false;

  sqlInsert = false;

  noBackupPrivileges = false;

  discardOwners = false;

  dropDatabase = false;

  createDatabase = false;

  encryption = false;

  isDocker = false;

  copyToHost = false;

  newlines = false;

  nosys = false;

  preserveRowIds = false;

  isDir = false;

  isRemote = false;

  insertIgnore?: boolean = null;

  replaceInto = false;
  // END CHECKBOX CONTROLS --------------------------------------------------

  // SELECT OBJECTS ---------------------------------------------------------
  includeTables?: string[] = null;

  excludeTables?: string[] = null;

  includeSchemata?: string[] = null;
  // END SELECT OBJECTS -----------------------------------------------------
}
