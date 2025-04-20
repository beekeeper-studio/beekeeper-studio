import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  LanguageServerClient,
  languageServerWithClient,
} from "@marimo-team/codemirror-languageserver";
import { WebSocketTransport } from "@open-rpc/client-js";
import { LSClientConfiguration } from "../types";
import { URI } from "vscode-uri";

const lsCompartment = new Compartment();

export function ls() {
  return lsCompartment.of([]);
}

export function applyLanguageServer(
  view: EditorView,
  config: LSClientConfiguration
) {
  const rootUri = URI.file(config.rootUri).toString();
  const documentUri = URI.file(config.documentUri).toString();
  const transport = new WebSocketTransport("ws://localhost:3000/server");

  transport.connection.addEventListener("message", function () {
    if (arguments[0].data) {
      try {
        const jsonrpc = JSON.parse(arguments[0].data);
        if (jsonrpc.method === "workspace/configuration") {
          transport.connection.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: jsonrpc.id,
              result: [null],
            })
          );
        }
      } catch {
        // do nothing
      }
    }
  });

  const lsClient = new LanguageServerClient({
    transport,
    rootUri,
    workspaceFolders: [
      {
        name: "workspace",
        uri: rootUri.toString(),
      },
    ],
  });

  const lsExtension = languageServerWithClient({
    client: lsClient,
    allowHTMLContent: true,
    documentUri,
    languageId: config.languageId,
    keyboardShortcuts: {
      rename: "",
      signatureHelp: "",
      goToDefinition: "",
    },
  });

  view.dispatch({
    effects: lsCompartment.reconfigure(lsExtension),
  });
}
