# Jest → Vitest migration guide

Studio is migrating its test suites from Jest to Vitest incrementally. Both
runners are installed and run side by side: specs listed in
`tests/vitest-migrated.json` run under Vitest and are automatically ignored by
Jest; everything else stays on Jest until it is ported. The end state is a
Jest-free repo (deleting `@vue/vue2-jest`, `ts-jest`, `babel-jest`,
`jest-environment-jsdom` and friends), reached one PR at a time.

## Why

`@vue/vue2-jest` is unsupported and the Jest transform chain
(babel-jest/ts-jest) duplicates what Vite already does for the renderer build.
`apps/ui-kit` already runs Vitest, and the studio renderer already builds with
Vite + `vite-ng-plugin-vue2`, so Vitest reuses the production toolchain.

## Layout

| File | Purpose |
| --- | --- |
| `tests/vitest-migrated.json` | Single source of truth: specs that run under Vitest |
| `vitest.shared.mjs` | Plugins (vue2 SFC, raw-`.ini`), aliases (derived from `vite.config.mjs` + test-only overrides: `@tests`, ui-kit source, `@bksLogger` → mainLogger), pool settings |
| `vitest.config.mjs` | Unit suite (jsdom) — Vitest side of `jest.config.js` |
| `vitest.integration.config.mjs` | Integration suite (node) — side of `jest.integration.config.js` |
| `vitest.ci.config.mjs` | Integration minus docker-DB specs — side of `jest.ci.config.js` |
| `tests/init/vitest-env-setup.mjs` | Logger init (twin of `tests/init/env-setup.js`) |
| `tests/init/vitest-integration-setup.mjs` | localStorage stub (twin of the jest `globals` block) |

Scripts (also available from the repo root): `yarn vitest:unit`,
`yarn vitest:integration`, `yarn vitest:ci`. They use the same
Electron-as-Node wrapper as the jest scripts — the `forks` pool forks the
electron binary with `ELECTRON_RUN_AS_NODE=1` inherited, so native modules
(better-sqlite3 etc., built for Electron's ABI by `install-app-deps`) load in
workers. Extra CLI args pass through: `yarn vitest:unit path/to/spec` filters
by path substring, `--silent` works, `-t "name"` filters by test name.

## How to migrate a spec

1. Add the spec's path (relative to `apps/studio`) to
   `tests/vitest-migrated.json`. That's the only registration step — Vitest
   picks it up and Jest starts ignoring it.
2. Add explicit imports at the top of the spec:
   `import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest"`
   (whichever the file uses). Globals are intentionally **off** in the vitest
   configs while both runners coexist — `@types/jest` and `vitest/globals`
   declare clashing ambient types, and the import makes runner ownership
   obvious per file.
3. Convert Jest APIs (table below).
4. Run it: `yarn vitest:unit <path>` (or `vitest:integration`), then run the
   matching jest suite and confirm its total file count dropped by one.
5. Anything surprising you had to do → add it to the findings log at the
   bottom of this file.

## API conversion table

| Jest | Vitest | Notes |
| --- | --- | --- |
| `jest.fn()` / `jest.spyOn()` | `vi.fn()` / `vi.spyOn()` | drop-in |
| `jest.mock(path, factory)` | `vi.mock(path, factory)` | hoisting caveat below |
| `jest.requireActual(path)` | `vi.mock(path, async (importOriginal) => { const actual = await importOriginal(); ... })` | factory becomes async; house example in `apps/ui-kit/tests/unit/sql-text-editor/querySelection.spec.ts` |
| `jest.setTimeout(ms)` | `vi.setConfig({ testTimeout: ms, hookTimeout: ms })` | jest's version governed hooks too — set both |
| `jest.Mock` (type) | `import type { Mock } from "vitest"` | all current uses are bare (no generics) |
| `jest.clearAllMocks()` etc. | `vi.clearAllMocks()` etc. | drop-in (`reset`/`restore` too) |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` | vitest does **not** fake `process.nextTick`/`queueMicrotask` by default; pass `{ toFake: [...] }` if a test relied on that |
| `jest.resetModules()` | `vi.resetModules()` | pair with dynamic `await import(...)` instead of `require(...)` |
| `/** @jest-environment jsdom */` | `/** @vitest-environment jsdom */` | 3 files use this today |
| `fail("msg")` | `expect.fail("msg")` | `fail` was already undefined under jest-circus; 4 call sites in `mongodb.spec.ts` |

## Gotchas (known ahead of time)

- **`vi.mock` factories are hoisted above imports *and* module body.** A
  factory that reads a top-level `const mockFoo = ...` throws a TDZ error
  under Vitest even though Jest tolerated it. Move the values into
  `vi.hoisted(() => ({ ... }))`. Vitest's error message names the offending
  variable. Known files with this shape: `tests/unit/lib/db/tunnel.spec.ts`
  (worst case), the ssh* integration specs, several `tests/unit/security/*`
  specs.
- **`require()` is not defined in test files.** Vitest transforms specs as
  ESM. Convert bare `require(...)` to static imports (or `await import(...)`
  when combined with `vi.resetModules()`). Files affected today:
  security.spec.ts, saved_connection.spec.js, sqlite.exploit.spec.ts,
  webPluginLoader.exploit.spec.ts, protocolBuilder.exploit.spec.ts,
  node-ssh-forward.spec.ts, oracle.spec.js, clearLogFilesMigration.spec.ts,
  ssh-agent*.spec.js, ssh-skip-bad-identity.spec.js.
- **CLI flags differ.** No `--ci`, no `--runInBand` (serial comes from
  `fileParallelism: false` in the shared config), no `--forceExit` (forked
  workers are force-terminated after teardown), no `--testPathPattern`
  (positional path substrings instead). `--silent`, `--testTimeout`,
  `--reporter=json --outputFile=...` (jest-compatible schema) all exist.
- **SFC `<style>` blocks now go through Vite** (vue2-jest skipped them).
  Vitest's default `css: false` stubs the output, and the `assets` alias from
  the renderer config is in `vitest.shared.mjs`, so scss imports resolve.
- **Aliases dropped on purpose** (jest needed them, vitest resolves the real
  packages): the `@marimo-team/codemirror-languageserver` stub and the
  `@libsql/core` → `lib-cjs` remap. If a migrated spec trips on either,
  re-add the mapping in `vitest.shared.mjs` and note it below.
- **Unhandled rejections between tests fail the run** (Vitest is stricter
  than Jest 29). Fix the leak in the test rather than reaching for
  `dangerouslyIgnoreUnhandledErrors`.

## End-state cleanup (for the final PR)

Remove: `jest`, `@types/jest`, `@vue/vue2-jest`, `babel-jest`,
`jest-environment-jsdom`, `jest-serializer-vue`, `jest-transform-stub`,
`jest-watch-typeahead`, `ts-jest`; the five `jest.*.config.js` files;
`tests/transformers/jest-raw-text-transformer.js`; `tests/vitest-migrated.json`
plumbing (configs then glob whole directories); the jest-side steps in
`.github/workflows/studio-test.yml`; `--testPathPattern`/`--runInBand`/`--ci`
flags in `windows-login-tests.yaml` and the kerberos docker entrypoints
(`dev/docker_*_kerberos/tests/entrypoint.sh` also gate on
`node_modules/jest` and parse jest's JSON reporter output — vitest's json
reporter emits the same fields). Switch `tsconfig.json` `"types": ["jest"]` to
`["vitest/globals"]` if globals get turned on.

## Findings log (append as you port)

- **2026-08-24, infra**: `github:`-style deps converted to pinned
  `git+https://` URLs (cassandra-knex, noty, sqlanywhere, xel,
  @vue/web-component-wrapper). Difference vs the codeload tarballs: yarn 1
  runs each git dep's `prepare` script on install (e.g.
  vue-web-component-wrapper now builds its dist with rollup during
  `yarn install`) — succeeded for all five, but a future git dep with a broken
  `prepare` would fail install where the tarball form didn't.
- **2026-08-24, TableInfoFilter.spec.ts (unit canary)**: only change needed
  was the explicit vitest import — SFC mount, jsdom, emitted() assertions all
  worked unchanged under `vite-ng-plugin-vue2`.
- **2026-08-24, queryAudit.spec.ts (integration canary)**: only change needed
  was the explicit vitest import. TypeORM + better-sqlite3 (native, Electron
  ABI) load fine inside the forked electron worker.
