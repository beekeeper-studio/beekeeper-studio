# Language Server Protocol Support

Beekeeper Studio UI Kit supports the [Language Server Protocol (LSP)](https://microsoft.github.io/language-server-protocol/), which enables powerful features like code completion, diagnostics, hover information, and more.

## Overview

The Language Server Protocol (LSP) defines a common protocol for communication between text editors and language servers, which provide language-specific features like intelligent code completion, error checking, and formatting. By supporting LSP, the Beekeeper Studio UI Kit allows you to connect your editors to any language server that implements the protocol.

## Setting Up LSP in the Text Editor

To enable LSP support in the Text Editor component, you need to configure the `languageServer` property:

```js
textEditor.languageServer = {
  // Language ID (required)
  languageId: "javascript",
  
  // Workspace root URI (required)
  rootUri: "/path/to/project",
  
  // Document URI (required)
  documentUri: "/path/to/project/file.js",
  
  // WebSocket transport (required)
  transport: {
    wsUri: "ws://localhost:3000/lsp"
  },
  
  // Optional timeout in milliseconds
  timeout: 10000,
  
  // Feature configuration
  features: {
    diagnostics: true,
    hover: true,
    completion: true,
    formatting: true,
    signatureHelp: true,
    references: true,
    documentHighlight: true,
    documentSymbol: true,
    semanticTokensEnabled: false
  }
};
```

## Available Features

The LSP integration supports the following features:

- **Code Completion**: Intelligent code suggestions as you type
- **Diagnostics**: Real-time error and warning highlighting
- **Hover Information**: Show documentation and type information when hovering over symbols
- **Formatting**: Apply code formatting rules from the language server
- **Signature Help**: Show parameter information for function calls
- **Find References**: Locate all references to a symbol
- **Document Highlighting**: Highlight all occurrences of the symbol under cursor
- **Document Symbols**: Navigate to symbols in the current document
- **Semantic Tokens**: Enhanced syntax highlighting based on semantic information

## Example: Using with a JavaScript Language Server

Here's an example of setting up the Text Editor with a JavaScript language server:

```html
<bks-text-editor id="js-editor"></bks-text-editor>
<script>
  const jsEditor = document.getElementById("js-editor");
  
  // Set content
  jsEditor.value = `function hello(name) {
    return "Hello, " + name;
  }`;
  
  // Configure language server
  jsEditor.languageServer = {
    languageId: "javascript",
    rootUri: "/path/to/project",
    documentUri: "/path/to/project/script.js",
    transport: {
      wsUri: "ws://localhost:3000/javascript-language-server"
    },
    features: {
      diagnostics: true,
      hover: true,
      completion: true,
      formatting: true
    }
  };
  
  // Listen for LSP ready event
  jsEditor.addEventListener("bks-lsp-ready", (event) => {
    console.log("Language server ready with capabilities:", event.detail.capabilities);
  });
</script>
```

## Setting Up a Language Server

To use LSP features, you need to run a language server that the Text Editor can connect to. There are many language servers available for different programming languages.

For example, to set up a JavaScript/TypeScript language server:

1. Install the language server:
   ```bash
   npm install -g typescript-language-server typescript
   ```

2. Run the language server with WebSocket support (you may need additional tooling to expose the language server over WebSockets).

## API Reference

For complete details about the LSP configuration options, see the [Text Editor API documentation](./api/text-editor.md).