// Ambient module declaration for the `@bksLogger` import specifier.
//
// `@bksLogger` doesn't resolve to a runtime file at the language level — its
// actual implementation depends on which build the importing module ends up
// in. Each build tool has its own alias config:
//
//   esbuild main+preload build → src/lib/log/mainLogger.ts
//   esbuild utility build      → src/lib/log/utilityLogger.ts
//   vite renderer build        → src/lib/log/rendererLogger.ts
//   jest (test runner)         → src/lib/log/mainLogger.ts (moduleNameMapper)
//   tsc / IDE                  → this file (this declaration)
//
// Declaring the export at the base `Logger` interface (which `MainLogger`,
// `NodeLogger`, and `RendererLogger` all extend in electron-log's types)
// means callers see only the common surface — `log.debug`, `log.transports`,
// `log.scope`, etc. — and can't accidentally reach for a transport that
// doesn't exist in their process (e.g. `log.transports.file` from renderer
// code would type-check against `MainLogger` but fail at runtime).
//
// No `bksLogger.ts` runtime file exists; the three real logger files
// (mainLogger.ts, utilityLogger.ts, rendererLogger.ts) hold the per-process
// configuration.

declare module '@bksLogger' {
  import type { Logger } from 'electron-log';
  const log: Logger;
  export default log;
}
