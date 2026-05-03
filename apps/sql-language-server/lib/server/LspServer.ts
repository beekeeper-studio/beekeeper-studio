import {
  Connection,
  TextDocuments,
  TextDocumentSyncKind,
  InitializeParams,
  InitializeResult,
  CompletionItem,
  Diagnostic,
  DidChangeConfigurationNotification,
} from "vscode-languageserver/browser";
import { TextDocument } from "vscode-languageserver-textdocument";
import { LiveParser } from "./parsing/LiveParser";
import { LezerParser } from "./parsing/LezerParser";
import { AstParser } from "./parsing/AstParser";
import { Dialect } from "./parsing/dialects";
import { SchemaCache } from "./schema/SchemaCache";
import { provideCompletion } from "./features/completion";
import { provideDiagnostics } from "./features/diagnostics";

const DIAGNOSTIC_DEBOUNCE_MS = 150;

/**
 * Wires the LSP `Connection` to our handlers. Transport-agnostic: the
 * caller (`worker.ts`) sets up the message reader/writer, instantiates a
 * Connection, then hands it here.
 */
export class LspServer {
  private parser: LiveParser = new LezerParser();
  private ast = new AstParser();
  private documents = new TextDocuments<TextDocument>(TextDocument);
  private schema: SchemaCache;
  private dialect: Dialect = "ansi";
  private diagnosticTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private connection: Connection) {
    this.schema = new SchemaCache(connection);
  }

  start(): void {
    this.connection.onInitialize(this.onInitialize.bind(this));
    this.connection.onInitialized(() => {
      this.connection.client.register(
        DidChangeConfigurationNotification.type,
        undefined
      );
    });
    this.connection.onDidChangeConfiguration((change) => {
      const cfg = change.settings?.sql ?? change.settings;
      if (cfg?.dialect && isDialect(cfg.dialect)) {
        this.dialect = cfg.dialect;
        for (const doc of this.documents.all()) {
          this.scheduleDiagnostics(doc);
        }
      }
    });

    this.connection.onCompletion(async (params): Promise<CompletionItem[]> => {
      const doc = this.documents.get(params.textDocument.uri);
      if (!doc) return [];
      return provideCompletion(doc, params, this.parser, this.dialect, this.schema);
    });

    this.documents.onDidChangeContent((change) => {
      this.scheduleDiagnostics(change.document);
    });
    this.documents.onDidClose((evt) => {
      this.connection.sendDiagnostics({
        uri: evt.document.uri,
        diagnostics: [],
      });
    });

    this.documents.listen(this.connection);
    this.connection.listen();
  }

  private onInitialize(params: InitializeParams): InitializeResult {
    const init = params.initializationOptions as
      | { dialect?: string }
      | undefined;
    if (init?.dialect && isDialect(init.dialect)) {
      this.dialect = init.dialect;
    }

    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          triggerCharacters: [".", " ", "("],
          resolveProvider: false,
        },
      },
    };
  }

  private scheduleDiagnostics(doc: TextDocument): void {
    const existing = this.diagnosticTimers.get(doc.uri);
    if (existing !== undefined) clearTimeout(existing);
    const handle = setTimeout(() => {
      this.diagnosticTimers.delete(doc.uri);
      this.runDiagnostics(doc).catch((err) => {
        this.connection.console.error(
          `Diagnostics failed for ${doc.uri}: ${err?.message ?? err}`
        );
      });
    }, DIAGNOSTIC_DEBOUNCE_MS);
    this.diagnosticTimers.set(doc.uri, handle);
  }

  private async runDiagnostics(doc: TextDocument): Promise<void> {
    const diagnostics: Diagnostic[] = await provideDiagnostics(
      doc,
      this.parser,
      this.ast,
      this.dialect,
      this.schema
    );
    this.connection.sendDiagnostics({
      uri: doc.uri,
      diagnostics,
    });
  }
}

function isDialect(s: string): s is Dialect {
  return s === "ansi" || s === "postgres" || s === "mysql" || s === "sqlite";
}
