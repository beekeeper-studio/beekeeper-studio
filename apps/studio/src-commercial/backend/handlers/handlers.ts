import { IFileHandlers } from "@/handlers/fileHandlers";
import { IGeneratorHandlers } from "@/handlers/generatorHandlers";
import { IQueryHandlers } from "@/handlers/queryHandlers";
import { ITempHandlers } from "@/handlers/tempHandlers";

// commercial
import { IConnectionHandlers } from "./connHandlers";
import { IExportHandlers } from "./exportHandlers";
import { IImportHandlers } from "./importHandlers";
import { IBackupHandlers } from "./backupHandlers";
import { IEnumHandlers } from "./enumHandlers";
import { IAwsHandlers } from "./awsHandlers";

export interface Handlers
  extends IConnectionHandlers,
    IQueryHandlers,
    IGeneratorHandlers,
    IImportHandlers,
    IExportHandlers,
    IBackupHandlers,
    IFileHandlers,
    IEnumHandlers,
    ITempHandlers,
    IAwsHandlers {}
