import { WebSocketTransport } from "@open-rpc/client-js";
import { LanguageServerConfiguration, LSContext } from "../../types";
import { URI } from "vscode-uri";
import { semanticTokens, semanticTokensCapabilities } from "./semanticTokens";
import { formattingCapabilities, lsFormatting } from "./formatting";
import _ from "lodash";
import { Extension, Facet } from "@codemirror/state";
import { isFeatureEnabled } from "./utils";
import { LanguageServerClient } from "../../LanguageServerClient";
import { EditorView, ViewPlugin } from "@codemirror/view";

const TIMEOUT: number = 10000;

export const lsContextFacet = Facet.define<LSContext, LSContext>({
  combine: (values) => values[0],
});

export function ls(
  config: LanguageServerConfiguration,
  onReady?: (capabilities: object) => void
): Extension {
  const rootUri = URI.file(config.rootUri).toString();
  const documentUri = URI.file(config.documentUri).toString();
  const timeout = config.timeout ?? TIMEOUT;

  let transport: WebSocketTransport;
  if (_.has(config.transport, "wsUri")) {
    transport = new WebSocketTransport(config.transport.wsUri);
    transport.connection.addEventListener("message", function () {
      if (arguments[0].data) {
        try {
          const jsonrpc = JSON.parse(arguments[0].data);
          if (jsonrpc.method === "workspace/configuration") {
            // HACK: the language server library we use does not handle
            // "workspace/configuration". "workspace/configuration" is a request
            // from the server -> client and it's unpredictable what the
            // server will do if we don't respond it. For example, in
            // sql-language-server, the server won't work if we don't respond to
            // "workspace/configuration".
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
  } else {
    transport = config.transport as WebSocketTransport;
  }

  const client = new LanguageServerClient({
    transport,
    rootUri,
    workspaceFolders: [{ name: "workspace", uri: rootUri }],
    capabilities: (defaultCapabilities) => {
      let capabilities = defaultCapabilities;
      capabilities = formattingCapabilities(capabilities);
      if (isFeatureEnabled(config, "semanticTokensEnabled")) {
        capabilities = semanticTokensCapabilities(capabilities);
      }
      return capabilities;
    },
    timeout,
  });

  const features = _.omit(config.features, ["semanticTokensEnabled"]);

  const lsExtension = client.extension({
    allowHTMLContent: true,
    documentUri,
    languageId: config.languageId,
    keyboardShortcuts: {
      rename: "",
      signatureHelp: "",
      goToDefinition: "",
    },
    ...features,
    // This allows us to trigger manual autocomplete when there is any character
    // behind cursor.
    completionMatchBefore: /.{0}/,
  });

  // Store a reference to the initialized LS client for use in the context
  const clientContext: LSContext = {
    client,
    documentUri,
    timeout,
  };

  const extensions = [
    // Extensions of the main language server extension. The order is important!
    lsContextFacet.of(clientContext),
    lsFormatting(),
    isFeatureEnabled(config, "semanticTokensEnabled") ? semanticTokens() : [],

    // Main language server extension
    lsExtension,
  ];

  if (onReady) {
    extensions.push(
      ViewPlugin.fromClass(
        class {
          constructor(view: EditorView) {
            const { client } = view.state.facet(lsContextFacet);
            client.onReady((capabilities) => {
              onReady(capabilities);
            });
          }
        }
      )
    );
  }

  return extensions;
}
