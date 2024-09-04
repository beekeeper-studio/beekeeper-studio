import { IFileHandlers } from "@/handlers/fileHandlers";
import { IGeneratorHandlers } from "@/handlers/generatorHandlers";
import { IQueryHandlers } from "@/handlers/queryHandlers";
import { ITempHandlers } from "@/handlers/tempHandlers";

// commercial
import { IConnectionHandlers } from "./connHandlers";
import { IExportHandlers } from "./exportHandlers";
import { IBackupHandlers } from "./backupHandlers";
import { IEnumHandlers } from "./enumHandlers";

export interface Handlers extends
  IConnectionHandlers,
  IQueryHandlers,
  IGeneratorHandlers,
  IExportHandlers,
  IBackupHandlers,
  IFileHandlers,
  IEnumHandlers,
  ITempHandlers
   {};
