import {
  LanguageServerClient,
  languageServerWithClient,
} from "@marimo-team/codemirror-languageserver";
import { WebSocketTransport, Client } from "@open-rpc/client-js";
import { LanguageServerConfiguration } from "../../types";
import { URI } from "vscode-uri";
import { semanticTokens, semanticTokensCapabilities } from "./semanticTokens";
import { formattingCapabilities, lsFormatting } from "./formatting";
import _ from "lodash";
import { Extension, Facet } from "@codemirror/state";
import { isFeatureEnabled } from "./utils";

const TIMEOUT = 10000;

export interface LSContext {
  client: Client;
  documentUri: string;
  timeout: number;
}

export const lsContextFacet = Facet.define<LSContext, LSContext>({
  combine: (values) => values[0],
});

export function ls(config: LanguageServerConfiguration): Extension {
  const rootUri = URI.file(config.rootUri).toString();
  const documentUri = URI.file(config.documentUri).toString();

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

  const lsClient = new LanguageServerClient({
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
    timeout: TIMEOUT,
  });

  const features = _.omit(config.features, ["semanticTokensEnabled"]);

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
    ...features,
  });

  return [
    lsContextFacet.of({
      client: lsClient.client,
      documentUri,
      timeout: TIMEOUT,
    }),
    lsFormatting(),
    isFeatureEnabled(config, "semanticTokensEnabled") ? semanticTokens() : [],
    lsExtension,
  ];
}
