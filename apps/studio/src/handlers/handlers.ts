import { ConnectionHandlers } from "./connHandlers";
import { QueryHandlers } from "./queryHandlers";

export interface Handlers extends
  ConnectionHandlers,
  QueryHandlers
   {};
