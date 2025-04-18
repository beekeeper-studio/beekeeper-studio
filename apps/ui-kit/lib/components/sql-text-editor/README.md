# BeeKeeper Studio SQL Text Editor Component

This component has been upgraded to use CodeMirror v6 (under the v2 folder).

The entry point files in this directory re-export the v2 components, so you can import them directly:

```js
import { SqlTextEditor } from "../../components/sql-text-editor"; 
```

The implementation files are split between v1 (CodeMirror 5) and v2 (CodeMirror 6).