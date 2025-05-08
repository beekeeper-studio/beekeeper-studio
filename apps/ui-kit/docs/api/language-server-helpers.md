# Language Server Helpers API

## Methods

| Name                      | Description                                                                                      | Arguments                                          | Return Value           |
| ------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ---------------------- |
| `getClient()`             | Returns the language server client instance                                                      | -                                                  | `LanguageServerClient` |
| `formatDocument()`        | Formats the entire document                                                                      | `options: LSP.FormattingOptions`                   |                        |
| `formatDocumentRange()`   | Formats a specific range in the document                                                         | `range: LSP.Range, options: LSP.FormattingOptions` |                        |
| `requestSemanticTokens()` | Requests semantic tokens for highlighting and apply them to the document. Returns the result ID. | `lastResultId?: string`                            | `string`               |

### LSP.FormattingOptions

| Property                 | Type                                        | Description                                                       |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------------------- |
| `tabSize`                | `uinteger`                                  | Size of a tab in spaces.                                          |
| `insertSpaces`           | `boolean`                                   | Prefer spaces over tabs.                                          |
| `trimTrailingWhitespace` | `boolean?`                                  | Trim trailing whitespace on a line.                               |
| `insertFinalNewline`     | `boolean?`                                  | Insert a newline at the end of the file if one does not exist.    |
| `trimFinalNewlines`      | `boolean?`                                  | Trim all newlines after the final newline at the end of the file. |
| `[key: string]`          | `boolean \| integer \| string \| undefined` | Signature for further properties.                                 |

### LSP.Range

| Property | Type           | Description                                                                                             |
| -------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| `start`  | `LSP.Position` | Start position (zero-based).                                                                            |
| `end`    | `LSP.Position` | End position (zero-based). To include the line ending, use the start of the next line as the end point. |

### LSP.Position

| Property    | Type     | Description                    |
| ----------- | -------- | ------------------------------ |
| `line`      | `number` | Line number (zero-based).      |
| `character` | `number` | Character offset (zero-based). |

