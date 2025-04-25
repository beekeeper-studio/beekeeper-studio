# Language Server Client API

## Properties

| Name    | Type      | Description                                                  |
| ------- | --------- | ------------------------------------------------------------ |
| `ready` | `boolean` | Whether the language server client is initialized and ready. |

## Methods

| Name                | Description                                                                                                                 | Arguments                                           | Return value   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------- |
| `request()`         | Sends a request to the language server.                                                                                     | `requestObject: RequestArguments, timeout?: number` | `Promise<any>` |
| `onReady()`         | Registers a callback for when the client is ready. If the client is already ready, the callback will be called immediately. | `callback: (capabilities: object) => void`          |                |
| `getCapabilities()` | Returns the language server capabilities.                                                                                   | -                                                   | `object`       |
| `extension()`       | Creates a CodeMirror extension.                                                                                             | `options: object`                                   | `Extension[]`  |

### RequestArguments

| Property | Type                     | Description                                                                 |
| -------- | ------------------------ | --------------------------------------------------------------------------- |
| `method` | `string`                 | The request method name. For example, `'workspace/executeCommand'`          |
| `params` | `(unknown[] \| object)?` | Optional parameters for the request. `{ command: "fixAllFixableProblems" }` |
