# Text Editor

A general-purpose text editor with language server protocol (LSP) support.

> **Note:** The text editor component is being upgraded to support LSP integration. Properties marked with ⚠️ are not yet implemented.

## Basic Usage

```html
<bks-text-editor></bks-text-editor>
<script>
  const textEditor = document.querySelector("bks-text-editor");
  textEditor.value = "function sum(a, b) {\n  return a + b;\n}";
</script>
```

## Keybindings

You can add custom keybindings using the `keybindings` property.

```js
textEditor.keybindings = {
  "Ctrl-Enter": () => {},
  "Cmd-Enter": () => {},
};
```

## Language Server Protocol Support

The Text Editor supports the Language Server Protocol (LSP), which provides advanced code intelligence features like autocompletion, diagnostics, and more.

```js
textEditor.lsConfig = {
  languageId: "javascript",
  rootUri: "/path/to/project",
  documentUri: "/path/to/project/file.js",
  transport: {
    wsUri: "ws://localhost:3000/lsp"
  },
  features: {
    diagnostics: true,
    hover: true,
    completion: true,
    formatting: true,
    semanticTokensEnabled: true
  }
};
```

## Context Menu

For info on how to modify the context menu can be found in
[Context Menu][context-menu] and the [Text Editor API][text-editor-api] docs.

## Customization

You can customize the appearance of the Text Editor by overriding the CSS variables. This allows you to change colors for syntax highlighting, background, text, and other visual elements to match your application's theme.

```css
.BksTextEditor {
  --bks-text-editor-activeline-bg-color: #373831;
  --bks-text-editor-atom-fg-color: #ae81ff;
  --bks-text-editor-bg-color: #ffffff;
  --bks-text-editor-bracket-fg-color: rgba(0, 0, 0, 0.67);
  --bks-text-editor-builtin-fg-color: #66d9ef;
  --bks-text-editor-comment-attribute-fg-color: #97b757;
  --bks-text-editor-comment-def-fg-color: #bc9262;
  --bks-text-editor-comment-fg-color: #75715e;
  --bks-text-editor-comment-tag-fg-color: #bc6283;
  --bks-text-editor-comment-type-fg-color: #bc6283;
  --bks-text-editor-cursor-bg-color: rgba(0, 0, 0, 0.87);
  --bks-text-editor-def-fg-color: #fd971f;
  --bks-text-editor-error-bg-color: #f8f8f0;
  --bks-text-editor-error-fg-color: #f92672;
  --bks-text-editor-fg-color: rgba(0, 0, 0, 0.87);
  --bks-text-editor-gutter-bg-color: #ffffff;
  --bks-text-editor-guttermarker-fg-color: #f8f8f2;
  --bks-text-editor-guttermarker-subtle-fg-color: rgba(0, 0, 0, 0.25);
  --bks-text-editor-header-fg-color: #ae81ff;
  --bks-text-editor-keyword-fg-color: #ff00f0;
  --bks-text-editor-linenumber-fg-color: rgba(0, 0, 0, 0.25);
  --bks-text-editor-link-fg-color: #ae81ff;
  --bks-text-editor-matchingbracket-fg-color: #ffffff;
  --bks-text-editor-number-fg-color: #ff8d21;
  --bks-text-editor-property-fg-color: #a6e22e;
  --bks-text-editor-selected-bg-color: rgba(0, 0, 0, 0.25);
  --bks-text-editor-string-fg-color: #0d9161;
  --bks-text-editor-tag-fg-color: #f92672;
  --bks-text-editor-variable-2-fg-color: #0099ff;
  --bks-text-editor-variable-3-fg-color: #66d9ef;
  --bks-text-editor-variable-fg-color: #f8f8f2;
}
```

## API

See the API reference below for more details.

- [Text Editor API][text-editor-api]

[text-editor-api]: ./api/text-editor.md
[context-menu]: ./context-menu.md
