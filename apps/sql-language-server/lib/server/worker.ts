/**
 * Web Worker entry point for the SQL language server.
 *
 * Bundle this file into a worker (via Vite library mode) and instantiate
 * with:
 *
 *   new Worker(
 *     new URL('@beekeeperstudio/sql-language-server/worker', import.meta.url),
 *     { type: 'module' }
 *   )
 *
 * The worker uses BrowserMessageReader/BrowserMessageWriter from
 * vscode-jsonrpc to speak LSP over `postMessage`. The host is responsible
 * for connecting its end of the channel — see `lib/client/createWorker.ts`.
 */

import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createConnection,
} from "vscode-languageserver/browser";
import { LspServer } from "./LspServer";

declare const self: DedicatedWorkerGlobalScope;

const reader = new BrowserMessageReader(self);
const writer = new BrowserMessageWriter(self);
const connection = createConnection(reader, writer);

new LspServer(connection).start();
