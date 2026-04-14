import { Extension } from "@codemirror/state";
import { FeatureOptions } from "@marimo-team/codemirror-languageserver/dist/lsp";
import { WebSocketTransport } from "@open-rpc/client-js";
import { VimOptions } from "./extensions/keymap";
import { LanguageServerClient } from "./LanguageServerClient";
import { TextEditor } from "./TextEditor";
import type * as LSP from "vscode-languageserver-protocol";
import { Decoration } from "@codemirror/view";

export interface EditorRange {
  id?: string;
  from: { line: number; ch: number };
  to: { line: number; ch: number };
}

export interface EditorMarker extends EditorRange {
  message?: string;
  /** You can make your own marker by passing in a CodeMirror Decoration. */
  decoration?: Decoration;
  /** @deprecated Use `decoration` instead. */
  element?: HTMLElement;
  /** @deprecated Use `decoration` instead. */
  onClick?: (event: MouseEvent) => void;
  type: "error" | "highlight" | "custom"; // | "warning"
}

export interface LineGutter {
  line: number;
  type: "changed";
}

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

export type TextEditorConfiguration = Configuration | ConfigurationWithLS;

type Configuration = ExtensionConfiguration & {
  parent: HTMLElement;
  onValueChange?: (value: string) => void;
  onSelectionChange?: (value: string) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onLspReady?: (capabilities: object) => void;
  initialValue?: string;
  focus?: boolean;
  replaceExtensions?: Extension | ((extensions: Extension) => Extension);
  actionsKeymap?: any[]
}

type ConfigurationWithLS = Configuration & {
  languageId: string;
  lsConfig?: LanguageServerConfiguration;
}

export interface ExtensionConfiguration {
  languageId?: LanguageId;
  readOnly?: boolean;
  keymap?: Keymap;
  vimOptions?: VimOptions;
  lineWrapping?: boolean;
  lineNumbers?: boolean;
  keybindings?: Keybindings;
  markers?: EditorMarker[];
  lineGutters?: LineGutter[];
  foldGutters?: boolean;
  actionsKeymap?: any[];
}

export type LanguageId = "json" | "html" | "javascript" | "redis";

export interface LSContext {
  client: LanguageServerClient;
  documentUri: string;
  timeout: number;
}

export interface ExposedMethods {
  ls: () => LanguageServerHelpers;
}

export interface LanguageServerHelpers {
  getClient: () => LanguageServerClient | null;
  formatDocument: (options: LSP.FormattingOptions) => Promise<void>;
  formatDocumentRange: (
    range: LSP.Range,
    options: LSP.FormattingOptions
  ) => Promise<void>;
  requestSemanticTokens: (lastResultId?: string) => Promise<void>;
}

export type TextEditorInitializedEvent = CustomEvent<{
  editor: TextEditor;
}>;

export type TextEditorValueChangeEvent = CustomEvent<{
  value: string;
}>;

export type TextEditorSelectionChangeEvent = CustomEvent<{
  value: string;
}>;

export type TextEditorFocusEvent = FocusEvent;

export type TextEditorBlurEvent = FocusEvent;

export type TextEditorLSPReadyEvent = CustomEvent<{
  capabilities: object;
}>;

export interface TextEditorEventMap extends HTMLElementEventMap {
  "bks-show-formatter-presets": boolean,
  "bks-value-change": TextEditorValueChangeEvent;
  "bks-selection-change": TextEditorSelectionChangeEvent;
  "bks-focus": TextEditorFocusEvent;
  "bks-blur": TextEditorFocusEvent;
  "bks-lsp-ready": TextEditorLSPReadyEvent;
  "bks-initialized": TextEditorInitializedEvent;
}

export type TextEditorMenuContext = {
  text: string;
  selectedText: string;
}

