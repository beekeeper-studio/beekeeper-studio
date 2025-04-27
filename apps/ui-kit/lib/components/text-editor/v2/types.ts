import { Extension } from "@codemirror/state";
import { FeatureOptions } from "@marimo-team/codemirror-languageserver/dist/plugin";
import { WebSocketTransport } from "@open-rpc/client-js";
import { LanguageServerClient } from "./LanguageServerClient";

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
  languageId?: string;
  features?: ExtendedFeatureOptions;
  /** The timeout for requests to the language server. Defaults to 10000ms. */
  timeout?: number;
}

export interface ExtendedFeatureOptions extends FeatureOptions {
  /** Whether to enable semantic tokens (default: true) */
  semanticTokensEnabled?: boolean;
}

export type Keymap = "default" | "vim" | "emacs";

export type Keybindings = {
  [key: string]: () => void;
};

export interface TextEditorConfiguration extends ExtensionConfiguration {
  parent: HTMLElement;
  onValueChange: (value: string) => void;
  onFocus?: (event: { event: FocusEvent }) => void;
  onBlur?: (event: { event: FocusEvent }) => void;
  onLspReady?: (capabilities: object) => void;
  languageId: string;
  initialValue?: string;
  focus?: boolean;
  replaceExtensions?: Extension | ((extensions: Extension) => Extension);
  lsConfig?: LanguageServerConfiguration;
}

export interface ExtensionConfiguration {
  readOnly?: boolean;
  keymap?: Keymap;
  lineWrapping?: boolean;
  lineNumbers?: boolean;
  keybindings?: Keybindings;
}

export interface LSContext {
  client: LanguageServerClient;
  documentUri: string;
  timeout: number;
}
