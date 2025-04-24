# Text Editor API

> **Note:** The text editor component is being upgraded to support LSP integration. Properties marked with ⚠️ are not yet implemented.

## Properties

| Name               | Type                          | Description                                                                                                                                                                                                                                | Default      | Status |
| ------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------ |
| `value`            | `string`                      | The text to display.                                                                                                                                                                                                                       | `''`         | ✅     |
| `readOnly`         | `boolean` \| `string`         | Disable editing. If "nocursor" is provided, focusing the editor is also disabled.                                                                                                                                                          | `false`      | ✅     |
| `keybindings`      | `object`                      | Object containing keybindings where the key is a combination of keys and the value is a function. For example, `{ 'Ctrl-Enter': function submit(){}, 'Cmd-Enter': function submit(){} }`.                                                  | `undefined`  | ✅     |
| `keymap`           | `string`                      | Configure the keymap to use. Possible values are 'default', 'vim', 'emacs' and 'sublime'.                                                                                                                                                  | `default`    | ✅     |
| `vimConfig`        | `object`                      | Configure vim mode.                                                                                                                                                                                                                        | `undefined`  | ⚠️     |
| `vimKeymaps`       | `array`                       | Configure custom key mappings in vim. See documentation in `texteditor/mixin.ts` for more details.                                                                                                                                         | `undefined`  | ⚠️     |
| `lineWrapping`     | `boolean`                     | Enable line wrapping.                                                                                                                                                                                                                      | `false`      | ✅     |
| `height`           | `number`                      | Set a fixed height for the editor.                                                                                                                                                                                                         | `undefined`  | ⚠️     |
| `focus`            | `boolean`                     | Control or observe focus state of the editor.                                                                                                                                                                                              | `false`      | ✅     |
| `contextMenuItems` | `array` \| `function`         | Add custom items to the context menu.                                                                                                                                                                                                      | `undefined`  | ✅     |
| `lineNumbers`      | `boolean`                     | Show line numbers in the editor.                                                                                                                                                                                                           | `true`       | ✅     |
| `foldGutter`       | `boolean`                     | Enable code folding in the editor.                                                                                                                                                                                                         | `false`      | ⚠️     |
| `autoFocus`        | `boolean`                     | Automatically focus the editor when it regains window focus after blur.                                                                                                                                                                    | `false`      | ⚠️     |
| `mode`             | `string` \| `object`          | The CodeMirror's mode to use. Modes are JavaScript programs that help color (and optionally indent) text written in a given language. Please refer to CodeMirror's [mode api](https://codemirror.net/5/doc/manual.html#modeapi) learn more | `text/plain` | ⚠️     |
| `clipboard`        | `Clipboard`                   | Custom clipboard handler for the editor used in vim. If provided, it must implement a `write` method to copy text to the clipboard. See [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard) for more details.  | `undefined`  | ⚠️     |
| `lsConfig`         | `LanguageServerConfiguration` | Configure the Language Server Protocol integration. See [Language Server Configuration](#language-server-configuration) below.                                                                                                             | `undefined`  | ✅     |

### Language Server Configuration

| Name              | Type                                      | Description                                                                                                                            | Default   |
| ----------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `languageId`      | `string`                                  | The language identifier (e.g., "javascript", "typescript", "sql").                                                                     | Required  |
| `rootUri`         | `string`                                  | The root URI of the workspace.                                                                                                         | Required  |
| `documentUri`     | `string`                                  | The URI of the document being edited.                                                                                                  | Required  |
| `transport`       | `{ wsUri: string } \| WebSocketTransport` | Transport config for the language server. Can be a plain object with wsUri, or a WebSocketTransport instance from @open-rpc/client-js. | Required  |
| `transport.wsUri` | `string`                                  | The WebSocket URI of the language server.                                                                                              | Required  |
| `features`        | `object`                                  | Configure which LSP features to enable.                                                                                                | See below |
| `timeout`         | `number`                                  | Timeout for LSP requests in milliseconds.                                                                                              | `10000`   |

#### Features Configuration

| Name                    | Type      | Description                                                | Default |
| ----------------------- | --------- | ---------------------------------------------------------- | ------- |
| `hover`                 | `boolean` | Enable hover information.                                  | `true`  |
| `completion`            | `boolean` | Enable code completion.                                    | `true`  |
| `diagnostics`           | `boolean` | Enable diagnostics (errors, warnings).                     | `true`  |
| `formatting`            | `boolean` | Enable document formatting.                                | `true`  |
| `signatureHelp`         | `boolean` | Enable signature help for function calls.                  | `true`  |
| `references`            | `boolean` | Enable finding references.                                 | `true`  |
| `documentHighlight`     | `boolean` | Enable highlighting references to the symbol under cursor. | `true`  |
| `documentSymbol`        | `boolean` | Enable document symbols.                                   | `true`  |
| `semanticTokensEnabled` | `boolean` | Enable semantic token highlighting.                        | `true`  |

## Events

| Name               | Description                                  | Event Detail               |
| ------------------ | -------------------------------------------- | -------------------------- |
| `bks-value-change` | Emitted when the text is changed.            | `{ value: string }`        |
| `bks-initialized`  | Emitted when the text editor is initialized. | `{ editor: TextEditor }`   |
| `bks-focus`        | Emitted when the text editor is focused.     | `{ event: FocusEvent }`    |
| `bks-blur`         | Emitted when the text editor is blurred.     | `{ event: FocusEvent }`    |
| `bks-lsp-ready`    | Emitted when the LSP client is ready.        | `{ capabilities: object }` |
