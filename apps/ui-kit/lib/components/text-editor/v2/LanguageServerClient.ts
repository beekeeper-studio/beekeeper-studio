import {
  LanguageServerClient as CodeMirrorLanguageServerClient,
  languageServerWithClient,
} from "@marimo-team/codemirror-languageserver";
import { Client } from "@open-rpc/client-js";
import { RequestArguments } from "@open-rpc/client-js/build/ClientInterface";

type ReadyCallback = (
  capabilities: CodeMirrorLanguageServerClient["capabilities"]
) => void;

export class LanguageServerClient {
  private isReady = false;
  private callbacks: ReadyCallback[] = [];
  private timeout: number;

  languageServerClient: CodeMirrorLanguageServerClient;
  rpcClient: Client;

  constructor(
    options: ConstructorParameters<typeof CodeMirrorLanguageServerClient>[0] & {
      timeout: number;
    }
  ) {
    this.languageServerClient = new CodeMirrorLanguageServerClient(options);
    this.languageServerClient.initializePromise.then(() => {
      this.callbacks.forEach((callback) =>
        callback(this.languageServerClient.capabilities)
      );
      this.isReady = true;
    });
    this.rpcClient = this.languageServerClient.client;
  }

  // --- Public API ---

  /**
   * Send a request to the language server.
   * @param requestObject
   * @param timeout Optional timeout for the request in ms. Defaults to the timeout set in the language server client
   */
  async request(requestObject: RequestArguments, timeout?: number): Promise<any> {
    return await this.rpcClient.request(requestObject, timeout ?? this.timeout);
  }

  /** Create an extension for codemirror. */
  extension(
    options: Omit<Parameters<typeof languageServerWithClient>[0], "client">
  ) {
    return languageServerWithClient({
      ...options,
      client: this.languageServerClient,
    });
  }

  onReady(callback: ReadyCallback) {
    if (this.isReady) {
      callback(this.languageServerClient.capabilities);
    } else {
      this.callbacks.push(callback);
    }
  }

  /** Warning: This can return null if the client is not ready yet. */
  getCapabilities(): CodeMirrorLanguageServerClient["capabilities"] | null {
    return this.languageServerClient.capabilities;
  }

  get ready() {
    return this.isReady;
  }
}
