# Jest → Vitest migration guide

Studio is moving its tests from Jest to Vitest, one spec at a time. Both
runners are installed while that happens:

- **Vitest** runs everything in `tests/vitest/` (`tests/vitest/unit/`,
  `tests/vitest/integration/`).
- **Jest** runs the legacy trees (`tests/unit/`, `tests/integration/`) and
  never looks inside `tests/vitest/`.

So a spec's directory tells you which runner owns it. Migrating a spec means
moving it into `tests/vitest/` and porting its Jest APIs. There is no
registration list to maintain.

**New tests always go in `tests/vitest/`.** CI fails any PR that adds a spec
file to the legacy jest trees (`bin/check-for-new-jest-tests.sh`; e2e is
exempt). The migration is done when the legacy trees are empty and Jest is
uninstalled.

## Why

`@vue/vue2-jest` is unsupported, and the Jest transform chain
(babel-jest/ts-jest) duplicates work Vite already does for the renderer build.
Vitest reuses the production Vite toolchain, which `apps/ui-kit` already uses
for its tests.

## Where things live

| File | What it is |
| --- | --- |
| `tests/vitest/` | All vitest specs (`unit/`, `integration/`) |
| `vitest.shared.mjs` | Shared plugins, aliases, and pool settings |
| `vitest.config.mjs` | Unit suite (jsdom) — vitest twin of `jest.config.js` |
| `vitest.integration.config.mjs` | Integration suite (node) — twin of `jest.integration.config.js` |
| `vitest.ci.config.mjs` | Integration minus docker-DB specs — twin of `jest.ci.config.js` |
| `tests/init/vitest-env-setup.mjs` | Logger init (twin of `tests/init/env-setup.js`) |
| `tests/init/vitest-integration-setup.mjs` | localStorage stub (twin of the jest `globals` block) |

Scripts (work from the repo root too): `yarn vitest:unit`,
`yarn vitest:integration`, `yarn vitest:ci`. They use the same
Electron-as-Node wrapper as the jest scripts, so native modules
(better-sqlite3 etc.) load correctly in workers. Extra CLI args pass through:
`yarn vitest:unit path/to/spec` filters by path substring, `--silent` works,
`-t "name"` filters by test name.

## How to migrate a spec

1. `git mv` the spec from `tests/unit/...` or `tests/integration/...` to the
   same path under `tests/vitest/`. Both runners pick up the change
   automatically.
2. Fix any relative imports that pointed back into the old tree — use the
   `@tests/` alias (e.g. `@tests/lib/db`,
   `@tests/integration/lib/db/clients/all`). Shared helpers stay where they
   are; only the spec moves.
3. Add explicit vitest imports at the top of the file:
   `import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest"`
   (whichever the file uses).
4. Convert Jest APIs using the table below.
5. Run it: `yarn vitest:unit <path>` (or `vitest:integration`). Then confirm
   jest no longer collects it: `yarn internal:integration --listTests` (or the
   unit equivalent) should show one fewer file.
6. Hit anything surprising? Add it to the findings log at the bottom.

Note on globals: vitest `globals` are on because shared helpers
(`tests/lib/db.ts`, `tests/integration/lib/db/clients/all.js`) call
`describe`/`expect` ambiently and are still loaded by jest too, so they can't
import from `vitest` yet. Spec files still import explicitly — it makes runner
ownership obvious, and tsconfig still has `"types": ["jest"]`, so an ambient
`vi` wouldn't typecheck anyway.

### Docker-DB specs and CI

DB specs need no extra CI wiring. The per-database matrix collects specs from
both trees (`bin/get-db-files-as-json.sh`), and `bin/integration-tests.sh`
routes each chunk by path: `tests/vitest/**` goes to `yarn
vitest:integration`, everything else to jest. Two caveats:

- The vitest branch of that dispatch skips the oracle instant-client setup.
  When `oracle.spec.js` migrates, move the dispatch below that setup or gate
  it.
- The `sqlserver-winauth` and kerberos flows call `internal:integration`
  directly and bypass the dispatch. Migrating those specs means updating
  `windows-login-tests.yaml` / `dev/docker_*_kerberos/tests/entrypoint.sh` in
  the same PR.

## API conversion table

| Jest | Vitest | Notes |
| --- | --- | --- |
| `jest.fn()` / `jest.spyOn()` | `vi.fn()` / `vi.spyOn()` | drop-in |
| `jest.mock(path, factory)` | `vi.mock(path, factory)` | hoisting caveat below |
| `jest.requireActual(path)` | `vi.mock(path, async (importOriginal) => { const actual = await importOriginal(); ... })` | factory becomes async; example in `apps/ui-kit/tests/unit/sql-text-editor/querySelection.spec.ts` |
| `jest.setTimeout(ms)` | `vi.setConfig({ testTimeout: ms, hookTimeout: ms })` | jest's version governed hooks too — set both |
| `jest.Mock` (type) | `import type { Mock } from "vitest"` | all current uses are bare (no generics) |
| `jest.clearAllMocks()` etc. | `vi.clearAllMocks()` etc. | drop-in (`reset`/`restore` too) |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` | vitest does **not** fake `process.nextTick`/`queueMicrotask` by default; pass `{ toFake: [...] }` if a test relied on that |
| `jest.resetModules()` | `vi.resetModules()` | pair with dynamic `await import(...)` instead of `require(...)` |
| `/** @jest-environment jsdom */` | `/** @vitest-environment jsdom */` | 3 files use this today |
| `fail("msg")` | `expect.fail("msg")` | `fail` was already undefined under jest-circus; 4 call sites in `mongodb.spec.ts` |

## Gotchas

- **`vi.mock` factories are hoisted above imports and the module body.** A
  factory that reads a top-level `const mockFoo = ...` throws a TDZ error,
  even though Jest tolerated it. Move those values into
  `vi.hoisted(() => ({ ... }))`. The error message names the offending
  variable. Known files with this shape: `tests/unit/lib/db/tunnel.spec.ts`
  (worst case), the ssh* integration specs, several `tests/unit/security/*`
  specs.
- **`require()` doesn't exist in test files.** Vitest transforms specs as
  ESM. Convert bare `require(...)` to static imports, or `await import(...)`
  when paired with `vi.resetModules()`. Files affected today:
  security.spec.ts, saved_connection.spec.js, sqlite.exploit.spec.ts,
  webPluginLoader.exploit.spec.ts, protocolBuilder.exploit.spec.ts,
  node-ssh-forward.spec.ts, oracle.spec.js, clearLogFilesMigration.spec.ts,
  ssh-agent*.spec.js, ssh-skip-bad-identity.spec.js. Stray `require()` in
  **src** is fine — the `commonjs()` plugin handles it, same as the renderer
  build.
- **The `commonjs()` plugin turns lazy `require()` in src into eager
  imports.** A `try { require('optional-native') } catch` guard becomes a
  hard top-level dependency. Convert such sites to `await import(...)`, which
  stays lazy everywhere; `sqlserver.ts`'s `mssql/msnodesqlv8` load is the
  reference example.
- **Deep imports into packages need exact file paths.**
  `knex/lib/schema/compiler` fails; it must be `knex/lib/schema/compiler.js`
  (and directory entries need `/index.js`). CJS and the app bundlers tolerate
  the extensionless form, so this only surfaces under vitest. All
  `knex/lib/*` imports were fixed repo-wide already.
- **`vite:oxc` rejects invalid TypeScript that ts-jest/babel let through.**
  Example already fixed: a parameter that was both optional and defaulted
  (`selects?: string[] = ['*']`, TS1015) in `mongodb.ts`. If a spec's import
  graph hits such a file, fix the TypeScript — don't work around the
  transform.
- **CLI flags differ.** No `--ci`, no `--runInBand` (serial comes from
  `fileParallelism: false` in the shared config), no `--forceExit` (forked
  workers are force-terminated after teardown), no `--testPathPattern`
  (use positional path substrings instead). `--silent`, `--testTimeout`, and
  `--reporter=json --outputFile=...` (jest-compatible schema) all exist.
- **SFC `<style>` blocks now go through Vite** (vue2-jest skipped them).
  Vitest's default `css: false` stubs the output, and the `assets` alias from
  the renderer config is in `vitest.shared.mjs`, so scss imports resolve.
- **Two jest aliases were dropped on purpose** because vitest resolves the
  real packages: the `@marimo-team/codemirror-languageserver` stub and the
  `@libsql/core` → `lib-cjs` remap. If a migrated spec trips on either,
  re-add the mapping in `vitest.shared.mjs` and note it below.
- **Unhandled rejections between tests fail the run** (vitest is stricter
  than Jest 29). Fix the leak in the test rather than reaching for
  `dangerouslyIgnoreUnhandledErrors`.

## End-state cleanup (for the final PR)

When the legacy trees are empty:

- Remove the packages: `jest`, `@types/jest`, `@vue/vue2-jest`, `babel-jest`,
  `jest-environment-jsdom`, `jest-serializer-vue`, `jest-transform-stub`,
  `jest-watch-typeahead`, `ts-jest`.
- Delete the five `jest.*.config.js` files and
  `tests/transformers/jest-raw-text-transformer.js`.
- Move the specs up a level (`tests/vitest/unit/` → `tests/unit/`) and delete
  `bin/check-for-new-jest-tests.sh` plus its workflow job.
- Remove the jest-side steps in `.github/workflows/studio-test.yml` and the
  jest dispatch in `bin/integration-tests.sh` / `bin/get-db-files-as-json.sh`.
- Update `windows-login-tests.yaml` and the kerberos docker entrypoints
  (`dev/docker_*_kerberos/tests/entrypoint.sh`): drop
  `--testPathPattern`/`--runInBand`/`--ci` flags, the `node_modules/jest`
  gate, and the jest JSON-reporter parsing (vitest's json reporter emits the
  same fields).
- Switch `tsconfig.json` `"types": ["jest"]` to `["vitest/globals"]` if
  globals stay on.

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
- **2026-08-24, mariadb.spec.js (first testcontainers spec, 82 tests)**: the
  standard conversions were all it needed — vitest imports, `@tests/` aliases
  for the moved-tree imports, and the two `jest.setTimeout` calls swapped for
  `vi.setConfig` (the top one sets `hookTimeout` too since the container
  starts in `beforeAll`). testcontainers works unmodified in the forked
  electron worker: container start, mapped ports, and stop/cleanup all behave
  the same as under jest.
- **2026-08-24, sqlite.spec.js (first DB spec, 192 tests)**: the spec itself
  needed only the vitest import — `runCommonTests`/`runReadOnlyTests` and
  `DBTestUtil` run unmodified on both runners (that's why `globals: true` went
  in). Its import graph (`tests/lib/db.ts` → `createServer` → every client)
  surfaced four one-time fixes, each now a gotcha above: 17 extensionless
  `knex/lib/*` imports made ESM-exact; `commonjs()` added to the vitest
  plugins for src's bare `require()`s; sqlserver.ts's guarded
  `require('mssql/msnodesqlv8')` converted to a lazy `await import` (the
  plugin had hoisted it eagerly); one invalid optional+defaulted parameter in
  mongodb.ts fixed for `vite:oxc`. Verified alongside: the jest side of the
  matrix still passes with docker (mysql.spec.js, 642 tests) and jest
  collection dropped by exactly the migrated files
  (`internal:integration --listTests` = 44).
