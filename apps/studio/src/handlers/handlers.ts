import { ConnectionHandlers } from "./connHandlers";
import { GeneratorHandlers } from "./generatorHandlers";
import { QueryHandlers } from "./queryHandlers";

export interface Handlers extends
  ConnectionHandlers,
  QueryHandlers,
  GeneratorHandlers
   {};
