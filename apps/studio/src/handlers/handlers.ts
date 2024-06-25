import { IAppDbHandlers } from "./appDbHandlers";
import { IConnectionHandlers } from "./connHandlers";
import { IExportHandlers } from "./exportHandlers";
import { IGeneratorHandlers } from "./generatorHandlers";
import { IQueryHandlers } from "./queryHandlers";

export interface Handlers extends
  IConnectionHandlers,
  IQueryHandlers,
  IGeneratorHandlers,
  IExportHandlers,
  IAppDbHandlers
   {};
