import {
  LanguageServerClient,
  languageServerWithClient,
} from "@marimo-team/codemirror-languageserver";
import { Client } from "@open-rpc/client-js";
import { RequestArguments } from "@open-rpc/client-js/build/ClientInterface";

export class LanguageServerClientWrapper {
  private isReady = false;
  private callbacks: (() => void)[] = [];
  private timeout: number;

  languageServerClient: LanguageServerClient;
  rpcClient: Client;

  constructor(
    options: ConstructorParameters<typeof LanguageServerClient>[0] & {
      timeout: number;
    }
  ) {
    this.onReady(() => {
      this.isReady = true;
    });

    this.languageServerClient = new LanguageServerClient(options);
    this.languageServerClient.initializePromise.then(() =>
      this.dispatchReady()
    );
    this.rpcClient = this.languageServerClient.client;
  }

  /**
   * Send a request to the language server.
   * @param requestObject
   * @param timeout Optional timeout for the request in ms. Defaults to the timeout set in the language server client
   */
  request(requestObject: RequestArguments, timeout?: number) {
    return this.rpcClient.request(requestObject, timeout ?? this.timeout);
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

  onReady(callback: () => void) {
    if (this.isReady) {
      callback();
    } else {
      this.callbacks.push(callback);
    }
  }

  private dispatchReady() {
    this.callbacks.forEach((callback) => callback());
  }
}
