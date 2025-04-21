import { FeatureOptions } from "@marimo-team/codemirror-languageserver/dist/plugin";
import { WebSocketTransport } from "@open-rpc/client-js";

export interface LanguageServerConfiguration {
  /** The WebSocket URI of the language server. For example, `ws://localhost:3000/server` */
  transport:
    | WebSocketTransport
    | {
        /** The WebSocket URI of the language server. For example, `ws://localhost:3000/server` */
        wsUri: string;
      };
  /** The root URI of the workspace. For example, `/home/user/tests/` */
  rootUri: string;
  /** The document URI of the current document. For example, `/home/user/tests/test.sql` */
  documentUri: string;
  /** The language id of the current document. For example, `sql` */
  languageId: string;

  features?: ExtendedFeatureOptions;
}

export interface ExtendedFeatureOptions extends FeatureOptions {
  /** Whether to enable semantic tokens (default: true) */
  semanticTokensEnabled?: boolean;
}

export type Keymap = "default" | "vim" | "emacs";

export type Keybindings = {
  [key: string]: () => void;
};
