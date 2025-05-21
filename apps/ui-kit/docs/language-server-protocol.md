# Language Server Protocol Support

Beekeeper Studio UI Kit supports the [Language Server Protocol (LSP)](https://microsoft.github.io/language-server-protocol/), which enables powerful features like code completion, diagnostics, hover information, and more.

## Overview

The Language Server Protocol (LSP) defines a common protocol for communication between text editors and language servers, which provide language-specific features like intelligent code completion, error checking, and formatting. By supporting LSP, the Beekeeper Studio UI Kit allows you to connect your editors to any language server that implements the protocol.

## Setting Up LSP in the Text Editor

To enable LSP support in the Text Editor component, you need to configure the `lsConfig` property:

```js
textEditor.lsConfig = {
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
};
```

## LSP Helpers

The Text Editor component will automatically send requests to the language server when necessary. But you can also use the LSP helpers to send requests directly:

```js
textEditor.addEventListener("bks-lsp-ready", async () => {
  // Get the language server helpers
  const helpers = textEditor.ls();

  // Request a document formatting and apply it
  await helpers.formatDocument({ tabSize: 2, insertSpaces: true });

  // Get the language server client
  const client = helpers.getClient();

  // Request a custom command to the language server
  await client.request({
    method: "workspace/executeCommand",
    params: { command: "fixAllFixableProblems" },
  });
})
```

Make sure that you wait for the `bks-lsp-ready` event before interacting with the language server.

For more information about the helpers, see the [Language Server Helpers API](./api/language-server-helpers.md).

## Available Features

The LSP integration supports the following features:

- **Code Completion**: Intelligent code suggestions as you type
- **Diagnostics**: Real-time error and warning highlighting
- **Hover Information**: Show documentation and type information when hovering over symbols
- **Formatting**: Apply code formatting rules from the language server
- **Signature Help**: Show parameter information for function calls
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
  jsEditor.lsConfig = {
    languageId: "javascript",
    rootUri: "/path/to/project",
    documentUri: "/path/to/project/script.js",
    transport: {
      wsUri: "ws://localhost:3000/javascript-language-server"
    },
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

## Advanced Example: Using WebSocketTransport

For more control over the WebSocket connection, you can use the WebSocketTransport class instead of a plain object with wsUri:

```js
import { WebSocketTransport } from '@open-rpc/client-js';

const transport = new WebSocketTransport("ws://localhost:3000/server");

textEditor.lsConfig = {
  languageId: "javascript",
  rootUri: "/path/to/project",
  documentUri: "/path/to/project/file.js",
  transport,
};
```

## API Reference

See the API reference below for more details.

- [Text Editor API documentation](./api/text-editor.md) for language server configuration.
- [Language Server Helpers API documentation](./api/language-server-helpers.md).
- [Language Server Client API documentation](./api/language-server-client.md).
