import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  LanguageServerClient,
  languageServerWithClient,
} from "@marimo-team/codemirror-languageserver";
import { WebSocketTransport } from "@open-rpc/client-js";
import { LSClientConfiguration } from "../types";
import { URI } from "vscode-uri";
import { SemanticTokensPlugin } from "./semanticTokens";

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

  const semanticTokensEnabled =
    typeof config.features?.semanticTokensEnabled === "undefined" ||
    config.features?.semanticTokensEnabled;

  const lsClient = new LanguageServerClient({
    transport,
    rootUri,
    workspaceFolders: [
      {
        name: "workspace",
        uri: rootUri.toString(),
      },
    ],
    capabilities: (defaultCapabilities) => ({
      ...defaultCapabilities,
      textDocument: {
        ...defaultCapabilities.textDocument,
        ...(semanticTokensEnabled && {
          semanticTokens: {
            dynamicRegistration: true,
            // prettier-ignore
            tokenTypes: [
            "namespace", "type", "class", "enum", "interface", "struct",
            "typeParameter", "parameter", "variable", "property", "enumMember",
            "event", "function", "method", "macro", "keyword", "modifier",
            "comment", "string", "number", "regexp", "operator", "decorator"
          ],
            // prettier-ignore
            tokenModifiers: [
            "declaration", "definition", "readonly", "static", "deprecated",
            "abstract", "async", "modification", "documentation", "defaultLibrary"
          ],
            formats: ["relative"],
            requests: {
              range: true,
              full: {
                delta: true,
              },
            },
            multilineTokenSupport: true,
            overlappingTokenSupport: true,
          },
        }),
      },
    }),
  });

  if (semanticTokensEnabled) {
    const semanticTokenConfig = {
      diagnosticsEnabled: false,
      hoverEnabled: false,
      completionEnabled: false,
      definitionEnabled: false,
      renameEnabled: false,
      codeActionsEnabled: false,
      signatureHelpEnabled: false,
      signatureActivateOnTyping: false,
    };
    lsClient.attachPlugin(
      new SemanticTokensPlugin(
        lsClient,
        documentUri,
        config.languageId,
        view,
        semanticTokenConfig
      )
    );
  }

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
    ...config.features,
  });

  view.dispatch({
    effects: lsCompartment.reconfigure(lsExtension),
  });
}
