import {
  LanguageServerClient,
  languageServerWithClient,
} from "@marimo-team/codemirror-languageserver";
import { Client } from "@open-rpc/client-js";

export class LanguageServerClientWrapper {
  private isReady = false;
  private callbacks: (() => void)[] = [];

  languageServerClient: LanguageServerClient;
  rpcClient: Client;

  constructor(...args: ConstructorParameters<typeof LanguageServerClient>) {
    this.onReady(() => {
      this.isReady = true;
    });

    this.languageServerClient = new LanguageServerClient(...args);
    this.languageServerClient.initializePromise.then(() =>
      this.dispatchReady()
    );
    this.rpcClient = this.languageServerClient.client;
  }

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

  dispatchReady() {
    this.callbacks.forEach((callback) => callback());
  }
}
