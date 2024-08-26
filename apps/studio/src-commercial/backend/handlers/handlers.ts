import { IBackupHandlers } from "@/handlers/backupHandlers";
import { IConnectionHandlers } from "./connHandlers";
import { IExportHandlers } from "@/handlers/exportHandlers";
import { IFileHandlers } from "@/handlers/fileHandlers";
import { IGeneratorHandlers } from "@/handlers/generatorHandlers";
import { IQueryHandlers } from "@/handlers/queryHandlers";

export interface Handlers extends
  IConnectionHandlers,
  IQueryHandlers,
  IGeneratorHandlers,
  IExportHandlers,
  IBackupHandlers,
  IFileHandlers
   {};
