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

For more information on how to configure and use Language Server Protocol support, see the [Language Server Protocol documentation](./language-server-protocol.md).

## Replacing Editor Extensions

You can customize the internal behavior of the editor by replacing or modifying the default [CodeMirror](https://codemirror.net/) extensions using the `replaceExtensions` property. This is useful if you want to inject your own extensions.

### Usage

You can provide either:

- A function that takes the default list and returns a new list
- An array of extensions to **fully replace** the default set

```js
import { monokaiInit } from "@uiw/codemirror-theme-monokai";

// Modify existing extensions
textEditor.replaceExtensions = (defaultExtensions) => {
  return [
    ...defaultExtensions,
    monokaiInit({
      settings: {
        selection: "",
        selectionMatch: "",
      },
    }),
  ];
};

// Replace all default extensions
textEditor.replaceExtensions = [
  myCustomExtension,
  keymap.of([...customKeymap]),
];
```

## Context Menu

For info on how to modify the context menu can be found in
[Context Menu][context-menu] and the [Text Editor API][text-editor-api] docs.

## Customization

You can customize the appearance of the Text Editor by overriding the CSS variables. This allows you to change colors for syntax highlighting, background, text, and other visual elements to match your application's theme.

```css
.BksTextEditor {
  --text-editor-activeline-bg: rgba(0, 0, 0, 0.03);
  --text-editor-activeline-gutter-bg: rgba(0, 0, 0, 0.03);
  --text-editor-atom-fg: #ae81ff;
  --text-editor-bg: white;
  --text-editor-bracket-fg: rgba(0, 0, 0, 0.67);
  --text-editor-builtin-fg: #66d9ef;
  --text-editor-comment-attribute-fg: #97b757;
  --text-editor-comment-def-fg: #bc9262;
  --text-editor-comment-fg: #75715e;
  --text-editor-comment-tag-fg: #bc6283;
  --text-editor-comment-type-fg: #bc6283;
  --text-editor-cursor-bg: rgba(0, 0, 0, 0.87);
  --text-editor-def-fg: #fd971f;
  --text-editor-error-bg: #f8f8f0;
  --text-editor-error-fg: #f92672;
  --text-editor-fg: rgba(0, 0, 0, 0.87);
  --text-editor-gutter-bg: white;
  --text-editor-guttermarker-fg: #f8f8f2;
  --text-editor-guttermarker-subtle-fg: rgba(0, 0, 0, 0.25);
  --text-editor-header-fg: #ae81ff;
  --text-editor-keyword-fg: #ff00f0;
  --text-editor-linenumber-fg: rgba(0, 0, 0, 0.25);
  --text-editor-link-fg: #ae81ff;
  --text-editor-matchingbracket-fg: #999977;
  --text-editor-matchingbracket-bg: rgba(153, 153, 119, 0.2);
  --text-editor-number-fg: #ff8d21;
  --text-editor-property-fg: #a6e22e;
  --text-editor-selected-bg: rgba(0, 0, 0, 0.25);
  --text-editor-string-fg: rgb(12.075, 125.925, 85.675);
  --text-editor-tag-fg: #f92672;
  --text-editor-variable-2-fg: #0099ff;
  --text-editor-variable-3-fg: #66d9ef;
  --text-editor-variable-fg: hsla(0, 0%, -10%, 0.87);
  --text-editor-namespace-fg: #7a7a7a;
  --text-editor-type-fg: #00aa66;
  --text-editor-class-fg: #4ec9b0;
  --text-editor-enum-fg: #00aa77;
  --text-editor-interface-fg: #00cc88;
  --text-editor-struct-fg: #00bb99;
  --text-editor-typeParameter-fg: #00aaaa;
  --text-editor-parameter-fg: #2288dd;
  --text-editor-property-fg: #9cdcfe;
  --text-editor-enumMember-fg: #4488ff;
  --text-editor-decorator-fg: #cc33cc;
  --text-editor-event-fg: #5555ff;
  --text-editor-function-fg: #dcdcaa;
  --text-editor-method-fg: #4488ee;
  --text-editor-macro-fg: #8855dd;
  --text-editor-label-fg: #666666;
  --text-editor-regexp-fg: #ee5555;
  --text-editor-operator-fg: #d4d4d4;
  --text-editor-definition-fg: #fd971f;
  --text-editor-variableName-fg: #f8f8f2;
  --text-editor-bool-fg: #ae81ff;
  --text-editor-null-fg: #ae81ff;
  --text-editor-className-fg: #4ec9b0;
  --text-editor-propertyName-fg: #9cdcfe;
  --text-editor-punctuation-fg: rgba(0, 0, 0, 0.67);
  --text-editor-meta-fg: #75715e;
  --text-editor-typeName-fg: #4ec9b0;
  --text-editor-labelName-fg: #c8c8c8;
  --text-editor-attributeName-fg: #9cdcfe;
  --text-editor-attributeValue-fg: rgb(12.075, 125.925, 85.675);
  --text-editor-heading-fg: #ae81ff;
  --text-editor-url-fg: #ae81ff;
  --text-editor-processingInstruction-fg: #75715e;
  --text-editor-special-string-fg: rgb(16.5375, 172.4625, 117.3375);
}
```

## API

See the API reference below for more details.

- [Text Editor API][text-editor-api]

[text-editor-api]: ./api/text-editor.md
[context-menu]: ./context-menu.md
