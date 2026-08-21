# Text Editor API

> **Note:** The text editor component is being upgraded to support LSP integration. Properties marked with ⚠️ are not yet implemented.

## Properties

| Name                | Type                                                      | Description                                                                                                                                                                                                                               | Default     | Status |
| ------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| `value`             | `string`                                                  | The text to display.                                                                                                                                                                                                                      | `''`        | ✅     |
| `readOnly`          | `boolean` \| `string`                                     | Disable editing. If "nocursor" is provided, focusing the editor is also disabled.                                                                                                                                                         | `false`     | ✅     |
| `keybindings`       | `object`                                                  | Object containing keybindings where the key is a combination of keys and the value is a function. For example, `{ 'Ctrl-Enter': function submit(){}, 'Cmd-Enter': function submit(){} }`.                                                 | `undefined` | ✅     |
| `keymap`            | `string`                                                  | Configure the keymap to use. Possible values are 'default', 'vim', 'emacs' and 'minimal-emacs'. 'emacs' is the full emacs keymap; 'minimal-emacs' is the small set of bindings macOS and GNOME provide in every text field.                                                                                                                                                 | `default`   | ✅     |
| `lineWrapping`      | `boolean`                                                 | Enable line wrapping.                                                                                                                                                                                                                     | `false`     | ✅     |
| `focus`             | `boolean`                                                 | Control or observe focus state of the editor.                                                                                                                                                                                             | `false`     | ✅     |
| `contextMenuItems`  | `array` \| `function`                                     | Add custom items to the context menu.                                                                                                                                                                                                     | `undefined` | ✅     |
| `lineNumbers`       | `boolean`                                                 | Show line numbers in the editor.                                                                                                                                                                                                          | `true`      | ✅     |
| `lsConfig`          | `LanguageServerConfiguration`                             | Configure the Language Server Protocol integration. See [Language Server Configuration](#language-server-configuration) below.                                                                                                            | `undefined` | ✅     |
| `replaceExtensions` | `Extension[] \| (extensions: Extension[]) => Extension[]` | Replace or modify the default CodeMirror extensions used by the editor. Accepts either a full list of extensions or a function to transform the default list.                                                                             | `undefined` | ✅     |
| `vimConfig`         | `object`                                                  | Configure vim mode.                                                                                                                                                                                                                       | `undefined` | ⚠️     |
| `vimKeymaps`        | `VimDirective[]`                                          | Configure vim from the host app: mappings (recursive or `noremap`), `unmap`, `mapclear` and `set`. See [Vim Directives](#vim-directives) below.                                                                                           | `undefined` | ⚠️     |
| `foldGutter`        | `boolean`                                                 | Enable code folding in the editor.                                                                                                                                                                                                        | `false`     | ⚠️     |
| `clipboard`         | `Clipboard`                                               | Custom clipboard handler for the editor used in vim. If provided, it must implement a `write` method to copy text to the clipboard. See [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard) for more details. | `undefined` | ⚠️     |
| `height`            | `number`                                                  | **[Deprecated]** Use CSS to control the editor height instead.                                                                                                                                                                            | `undefined` | ❌     |

<!-- Not sure if autofocus should be here, see https://github.com/beekeeper-studio/beekeeper-studio/issues/3051 -->
<!-- | `autoFocus`         | `boolean`                                                 | Automatically focus the editor when it regains window focus after blur.                                                                                                                                                                   | `false`     | ⚠️     | -->

### Vim Directives

`vimKeymaps` takes a list of directives, applied in order. Anything without a
`type` is a mapping.

| Directive | Fields | Vim equivalent |
| --- | --- | --- |
| mapping | `lhs`, `rhs`, `mode?`, `noremap?` | `map` / `nmap` / `nnoremap` / … |
| `type: 'unmap'` | `lhs`, `mode?` | `unmap` / `nunmap` / … |
| `type: 'mapclear'` | `mode?` | `mapclear` / `nmapclear` / … |
| `type: 'set'` | `name`, `value` | `set name`, `set noname`, `set name=value` |

`mode` is `'normal'`, `'insert'` or `'visual'`; leaving it out means every
mode. Set `noremap` whenever the `rhs` contains the `lhs`, which would
otherwise expand without end.

```js
const vimKeymaps = [
  { lhs: ';', rhs: ':' },
  { lhs: 'y', rhs: '"*y', mode: 'normal', noremap: true },
  { type: 'set', name: 'ignorecase', value: true },
]
```

Note that vim mappings are registered on a process-global vim instance shared
by every editor on the page, so the last configuration applied wins.

### Vim Status Line

With `keymap="vim"` the editor renders CodeMirror's vim status panel along the
bottom: the current mode, pending keys, and the `:` and `/` input lines.

Adjust it with `--bks-text-editor-vim-panel-bg-color` and
`--bks-text-editor-vim-panel-fg-color`, which default to `inherit` so the bar
follows whatever theme you hand CodeMirror, plus
`--bks-text-editor-vim-panel-font-size` and
`--bks-text-editor-vim-panel-border`. The font size is deliberately its own
variable rather than `--bks-text-editor-font-size`, so the bar does not grow
with the editor's font size setting. Overriding the `.cm-vim-panel` class from a
stylesheet is not reliable: CodeMirror injects both its own panel defaults and
the ones `@replit/codemirror-vim` ships as themes, and those outrank plain
selectors. The variables are applied from the editor's theme so they win.

### Language Server Configuration

| Name          | Type                                      | Description                                                                                                                            | Default   |
| ------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `languageId`  | `string`                                  | The language identifier (e.g., "javascript", "typescript", "sql").                                                                     | Required  |
| `rootUri`     | `string`                                  | The root URI of the workspace.                                                                                                         | Required  |
| `documentUri` | `string`                                  | The URI of the document being edited.                                                                                                  | Required  |
| `transport`   | `{ wsUri: string } \| WebSocketTransport` | Transport config for the language server. Can be a plain object with wsUri, or a WebSocketTransport instance from @open-rpc/client-js. | Required  |
| `features`    | `object`                                  | Configure which LSP features to enable.                                                                                                | See below |
| `timeout`     | `number`                                  | Timeout for LSP requests in milliseconds.                                                                                              | `10000`   |

#### Features Configuration

| Name                        | Type      | Description                               | Default |
| --------------------------- | --------- | ----------------------------------------- | ------- |
| `hoverEnabled`              | `boolean` | Enable hover information.                 | `true`  |
| `completionEnabled`         | `boolean` | Enable code completion.                   | `true`  |
| `diagnosticsEnabled`        | `boolean` | Enable diagnostics (errors, warnings).    | `true`  |
| `signatureHelpEnabled`      | `boolean` | Enable signature help for function calls. | `true`  |
| `semanticTokensEnabled`     | `boolean` | Enable semantic token highlighting.       | `true`  |
| `definitionEnabled`         | `boolean` | Enable go-to-definition.                  | `true`  |
| `renameEnabled`             | `boolean` | Enable rename functionality.              | `true`  |
| `codeActionsEnabled`        | `boolean` | Enable code actions.                      | `true`  |
| `signatureActivateOnTyping` | `boolean` | Show signature help while typing.         | `false` |

## Methods

| Name   | Description                                                                                                            | Arguments |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | --------- |
| `ls()` | Returns the Language Server Helpers. See [Language Server Helpers](./language-server-helpers.md) for more information. | -         |

## Events

| Name               | Description                                  | Event Detail               |
| ------------------ | -------------------------------------------- | -------------------------- |
| `bks-value-change` | Emitted when the text is changed.            | `{ value: string }`        |
| `bks-initialized`  | Emitted when the text editor is initialized. | `{ editor: TextEditor }`   |
| `bks-focus`        | Emitted when the text editor is focused.     | `{ event: FocusEvent }`    |
| `bks-blur`         | Emitted when the text editor is blurred.     | `{ event: FocusEvent }`    |
| `bks-lsp-ready`    | Emitted when the LSP client is ready.        | `{ capabilities: object }` |
