export interface LSClientConfiguration {
  /** The WebSocket URI of the language server. For example, `ws://localhost:3000/server` */
  wsUri: string;
  /** The root URI of the workspace. For example, `/home/user/tests/` */
  rootUri: string;
  /** The document URI of the current document. For example, `/home/user/tests/test.sql` */
  documentUri: string;
}

export type Keymap = "default" | "vim" | "emacs";

export type Keybindings = {
  [key: string]: () => void;
};
