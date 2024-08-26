import { IBackupHandlers } from "./backupHandlers";
import { IConnectionHandlers } from "./connHandlers";
import { IExportHandlers } from "./exportHandlers";
import { IFileHandlers } from "./fileHandlers";
import { IGeneratorHandlers } from "./generatorHandlers";
import { IQueryHandlers } from "./queryHandlers";

export interface Handlers extends
  IConnectionHandlers,
  IQueryHandlers,
  IGeneratorHandlers,
  IExportHandlers,
  IBackupHandlers,
  IFileHandlers
   {};
