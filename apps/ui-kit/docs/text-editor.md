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
  --bks-text-editor-activeline-bg-color: rgba(0, 0, 0, 0.03);
  --bks-text-editor-activeline-gutter-bg-color: rgba(0, 0, 0, 0.03);
  --bks-text-editor-atom-fg-color: #ae81ff;
  --bks-text-editor-bg-color: white;
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
  --bks-text-editor-gutter-bg-color: white;
  --bks-text-editor-guttermarker-fg-color: #f8f8f2;
  --bks-text-editor-guttermarker-subtle-fg-color: rgba(0, 0, 0, 0.25);
  --bks-text-editor-header-fg-color: #ae81ff;
  --bks-text-editor-keyword-fg-color: #ff00f0;
  --bks-text-editor-linenumber-fg-color: rgba(0, 0, 0, 0.25);
  --bks-text-editor-link-fg-color: #ae81ff;
  --bks-text-editor-matchingbracket-fg-color: #999977;
  --bks-text-editor-matchingbracket-bg-color: rgba(153, 153, 119, 0.2);
  --bks-text-editor-number-fg-color: #ff8d21;
  --bks-text-editor-property-fg-color: #a6e22e;
  --bks-text-editor-selected-bg-color: rgba(0, 0, 0, 0.25);
  --bks-text-editor-string-fg-color: rgb(12.075, 125.925, 85.675);
  --bks-text-editor-tag-fg-color: #f92672;
  --bks-text-editor-variable-2-fg-color: #0099ff;
  --bks-text-editor-variable-3-fg-color: #66d9ef;
  --bks-text-editor-variable-fg-color: hsla(0, 0%, -10%, 0.87);
  --bks-text-editor-namespace-fg-color: #7a7a7a;
  --bks-text-editor-type-fg-color: #00aa66;
  --bks-text-editor-class-fg-color: #4ec9b0;
  --bks-text-editor-enum-fg-color: #00aa77;
  --bks-text-editor-interface-fg-color: #00cc88;
  --bks-text-editor-struct-fg-color: #00bb99;
  --bks-text-editor-typeParameter-fg-color: #00aaaa;
  --bks-text-editor-parameter-fg-color: #2288dd;
  --bks-text-editor-property-fg-color: #9cdcfe;
  --bks-text-editor-enumMember-fg-color: #4488ff;
  --bks-text-editor-decorator-fg-color: #cc33cc;
  --bks-text-editor-event-fg-color: #5555ff;
  --bks-text-editor-function-fg-color: #dcdcaa;
  --bks-text-editor-method-fg-color: #4488ee;
  --bks-text-editor-macro-fg-color: #8855dd;
  --bks-text-editor-label-fg-color: #666666;
  --bks-text-editor-regexp-fg-color: #ee5555;
  --bks-text-editor-operator-fg-color: #d4d4d4;
  --bks-text-editor-definition-fg-color: #fd971f;
  --bks-text-editor-variableName-fg-color: #f8f8f2;
  --bks-text-editor-bool-fg-color: #ae81ff;
  --bks-text-editor-null-fg-color: #ae81ff;
  --bks-text-editor-className-fg-color: #4ec9b0;
  --bks-text-editor-propertyName-fg-color: #9cdcfe;
  --bks-text-editor-punctuation-fg-color: rgba(0, 0, 0, 0.67);
  --bks-text-editor-meta-fg-color: #75715e;
  --bks-text-editor-typeName-fg-color: #4ec9b0;
  --bks-text-editor-labelName-fg-color: #c8c8c8;
  --bks-text-editor-attributeName-fg-color: #9cdcfe;
  --bks-text-editor-attributeValue-fg-color: rgb(12.075, 125.925, 85.675);
  --bks-text-editor-heading-fg-color: #ae81ff;
  --bks-text-editor-url-fg-color: #ae81ff;
  --bks-text-editor-processingInstruction-fg-color: #75715e;
  --bks-text-editor-special-string-fg-color: rgb(16.5375, 172.4625, 117.3375);
}
```

## API

See the API reference below for more details.

- [Text Editor API][text-editor-api]

[text-editor-api]: ./api/text-editor.md
[context-menu]: ./context-menu.md
