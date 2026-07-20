# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beekeeper Studio is a cross-platform SQL editor and database manager built with Electron, Vue.js 2, and TypeScript. It supports 15+ databases and offers both community (GPLv3) and paid editions.

## Architecture

### Monorepo Structure
- **`apps/studio/`** - Main Electron application
- **`apps/ui-kit/`** - Reusable UI components library (`@beekeeperstudio/ui-kit`)
- **`apps/sqltools/`** - Currently unused workspace

### Technology Stack
- **Frontend**: Vue.js 2.7, TypeScript, Vuex for state management
- **Desktop**: Electron 31.7.3
- **Build**: ESBuild (main process), Vite (renderer process)
- **Testing**: Jest, Playwright
- **Styling**: SCSS with multiple themes

### Key Entry Points
All entrypoints are listed under src-commercial/entrypoints
- **Main Process**: `src-commercial/entrypoints/main.ts` (Electron main)
- **Renderer Process**: `src-commercial/entrypoints/renderer.ts` & `src/App.vue` (Vue application)
- **Preload Script**: `src-commercial/entrypoints/preload.ts`
- **Utility Process*: `src-commercial/entrypoints/utility.ts`

### Core Interfaces
- **ConnectionInterface** - Database connection screen
- **CoreInterface** - Main database interaction interface (when connected)

## Development Commands

**Package Manager**: This project uses Yarn (not npm).

### Root-level Commands (from project root)
```bash
# Development
yarn bks:dev              # Start development server (builds lib + starts electron)
yarn electron:serve       # Alias for bks:dev

# Building
yarn bks:build            # Build complete app (lib + electron)
yarn electron:build       # Alias for bks:build
yarn lib:build            # Build UI kit library only
yarn lib:dev              # Start UI kit in development/watch mode

# Testing
yarn test:unit            # Unit tests with Jest
yarn test:integration     # Integration tests
yarn test:e2e             # End-to-end tests with Playwright
yarn test:ci              # CI-specific test configuration
yarn test:codemirror      # CodeMirror-specific tests

# Linting
yarn all:lint             # Lint all workspaces
```

### Studio App Commands (from apps/studio/)
```bash
# Development
yarn electron:serve       # Start development with hot reload
yarn dev:esbuild          # Watch main process (ESBuild)
yarn dev:vite             # Watch renderer process (Vite)

# Building
yarn build                # Build both main and renderer processes
yarn build:esbuild        # Build main process only
yarn build:vite           # Build renderer process only
yarn electron:build       # Full production build with electron-builder

# Test Build (Agents - use this to test the build, also good for CI)
yarn run electron:build --linux AppImage  # Create Linux AppImage for testing

# Testing
yarn test:unit            # Unit tests
yarn test:integration     # Integration tests
yarn test:e2e             # E2E tests
yarn lint                 # ESLint
```

## Code Architecture

### Source Structure (apps/studio/src/)
```
components/          # Vue components organized by feature
├── common/         # Shared/reusable components
├── connection/     # Database connection forms
├── editor/         # Query editor components
├── export/         # Data export functionality
├── sidebar/        # Sidebar navigation components
└── ...

lib/                # Core business logic
├── db/            # Database clients and connection logic
├── editor/        # Text editor functionality (CodeMirror)
├── export/        # Data export functionality
├── cloud/         # Cloud/workspace features
└── ...

background/         # Electron main process code
common/            # Shared utilities and models
store/             # Vuex store modules
migration/         # Database migration scripts
assets/            # Styles, fonts, images
```

### Database Client Architecture
- Supports 15+ database types through unified client interface
- Database-specific clients in `src/lib/db/`
- Connection pooling and SSH tunneling support
- TypeORM used for app's internal SQLite database

### License Model
- Community features: GPLv3 license
- Paid features: Commercial EULA (code in `src-commercial/`)
- Both editions share the same codebase

### Plugin System
- Extensible architecture for third-party plugins
- Plugin manager with install/update capabilities
- Plugin code in `src/services/plugin/`

## Key Configuration Files

- **ESBuild**: `apps/studio/esbuild.mjs` (main process build)
- **Vite**: `apps/studio/vite.config.mjs` (renderer process build)
- **TypeScript**: `apps/studio/tsconfig.json`
- **Jest**: `apps/studio/jest.config.js` (plus specialized configs)
- **Electron Builder**: `apps/studio/electron-builder-config.js`

## Running Tests

Always run tests from the appropriate directory:
- From root: `yarn test:unit`, `yarn test:integration`, `yarn test:e2e`
- From apps/studio: `yarn test:unit`, `yarn test:integration`, `yarn test:e2e`

Test files are organized in `apps/studio/tests/`:
- `unit/` - Unit tests
- `integration/` - Integration tests
- `e2e/` - End-to-end tests with Playwright

## Development Workflow

1. **Setup**: `yarn install` from root
2. **Start development**: `yarn bks:dev` (from root) or `yarn electron:serve` (from apps/studio)
3. **Run tests**: `yarn test:unit` before committing
4. **Build**: `yarn bks:build` for production build

## Running & Controlling the App (for Agents)

This section is for AI agents (and humans) that need to install, build, launch, and
programmatically drive the Electron app — e.g. to reproduce a bug, capture screenshots, or
run an interaction. It is split into a common workflow, then the specifics for **agents on
a developer machine** vs. **agents in a headless/cloud sandbox** (Claude Code on the web,
CI, containers).

### Common: install → build → run
```bash
# From the repo root (uses Yarn workspaces):
yarn install                              # installs all workspace deps
yarn lib:build                            # build @beekeeperstudio/ui-kit first
yarn workspace beekeeper-studio build     # build main + renderer -> apps/studio/dist/main.js
# ...or the one-shot equivalent:
yarn bks:build
```
The built entry point is `apps/studio/dist/main.js`. A successful build is the prerequisite
for everything below.

### Controlling the app: Playwright `_electron`
The app is driven programmatically through the existing e2e harness in `apps/studio/e2e/`
(Playwright's `_electron`). Don't hand-roll a launcher — reuse:
- `e2e/helpers/launchElectron.ts` — launches `dist/main.js`, sets a viewport, dismisses the
  first-run tooltip, returns the `ElectronApplication`.
- `e2e/pageActions/` + `e2e/pageComponents/` — connect to a DB, write/run queries, open
  tables, toggle sidebars, etc.
- `e2e/screenshots/capture.spec.ts` (+ `configs.ts`) — a complete, self-contained reference:
  connects to a dockerized DB, sets the theme, zooms, opens views, and screenshots. Read
  this first; most control recipes are already there.

Run a spec (from `apps/studio/`):
```bash
cross-env TEST_MODE=1 yarn playwright test e2e/screenshots/capture.spec.ts --config=playwright.config.ts
```
`TEST_MODE=1` runs the production build against a throwaway app DB at `apps/studio/tmp/app.db`
(so licenses/settings persist there across launches — delete it for a clean slate).

**Useful control recipes** (all proven in `capture.spec.ts`):
- **Reach the Vuex store from the renderer:** the `#app` mount node is replaced by
  `.style-wrapper`, so `document.querySelector('#app').__vue__` is null after mount. Instead
  scan for the instance: `for (const el of document.querySelectorAll('body *')) if (el.__vue__?.$root) { root = el.__vue__.$root; break }` then use `root.$store` / `root.$util`.
- **Force dark theme:** `root.$store.dispatch('settings/save', { key: 'theme', value: 'dark' })`.
- **Unlock paid features (JSON sidebar, etc.):** create a *local* trial license (no network):
  `await root.$util.send('license/createTrialLicense')` then `root.$store.dispatch('licenses/sync')`.
- **Zoom the UI:** `electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1.15))`.
- **Secondary (JSON viewer) sidebar:** `sidebar/setSecondarySidebarWidth` must be dispatched
  *before* the sidebar opens (it doesn't resize reactively once open);
  `sidebar/setSecondarySidebarOpen` toggles it.
- After DDL, some clients (e.g. MySQL) don't auto-refresh the entities list — click the
  `Refresh` button (`TableList.vue`, `title="Refresh"`).

### Agents on a developer machine (macOS / Windows / Linux with a display)
- **Interactive dev:** `yarn bks:dev` (root) or `yarn electron:serve` (from `apps/studio/`)
  starts the app with hot reload. Use this to *see* the app.
- Native modules and the Electron binary install normally via `yarn install` (the
  `postinstall` runs `electron-builder install-app-deps`). No mirrors or workarounds needed.
- A display is present, so Playwright `_electron` and `yarn test:e2e` run directly — no xvfb.
- For dockerized test databases, `docker compose up <service> -d` works against your local
  Docker Desktop / daemon. See the repo-root `docker-compose.yml` for services, ports, and
  seed data.

### Agents in a headless / cloud sandbox (Claude Code on the web, CI, containers)
These environments are **ephemeral** (reclaimed after idle — `node_modules`, `dist`, the
Electron binary, and Docker state can all vanish, so re-check and re-run setup), **headless**
(no `DISPLAY`), and may enforce an **egress policy**. Adjust as follows:

- **No display → wrap every launch in `xvfb-run`:**
  ```bash
  xvfb-run -a --server-args="-screen 0 1920x1200x24" \
    env TEST_MODE=1 ELECTRON_DISABLE_SANDBOX=1 ELECTRON_EXTRA_LAUNCH_ARGS=--disable-gpu \
    yarn playwright test e2e/screenshots/capture.spec.ts --config=playwright.config.ts
  ```
  `ELECTRON_DISABLE_SANDBOX=1` is required when running as root without a user namespace.
- **Egress may block HTTPS to `github.com` / `codeload.github.com` (403) while git protocol
  still works.** This breaks `yarn install` on the GitHub-tarball dependencies (currently
  `cassandra-knex`, `tabulator`, `noty`, `node-sqlanywhere`, `@vue/web-component-wrapper`,
  `xel`). Workaround: `git clone` each at its pinned ref into `/tmp`, temporarily repoint its
  `package.json` entry to `file:/tmp/<clone>`, then `yarn install --prefer-offline`. **Revert
  those `package.json`/`yarn.lock` edits before committing** — they are local-only.
- **Electron binary won't download (it fetches from GitHub releases).** Install it from a
  mirror:
  ```bash
  cd node_modules/electron && \
    ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/" \
    ELECTRON_CUSTOM_DIR="{{ version }}" node install.js
  ```
- **Native-module ABI mismatch** (e.g. `better-sqlite3` "compiled against a different
  Node.js version"): rebuild for Electron, via mirrors:
  ```bash
  cd apps/studio && \
    ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/" ELECTRON_CUSTOM_DIR="{{ version }}" \
    ELECTRON_BUILDER_BINARIES_MIRROR="https://registry.npmmirror.com/-/binary/electron-builder-binaries/" \
    yarn electron-builder install-app-deps
  ```
- **Docker for test databases:** the daemon may not be running — start it (`dockerd`) before
  `docker compose`. Prefer bringing up **one database at a time**. Note the `mysql:8.0.21`
  employees image: its init script errors on a missing file and the container exits after
  loading the data; just `docker compose start mysql8` again to run the real server against
  the now-populated volume.

## UI Copy Style

User-facing strings (button labels, tooltips, alerts, helper text, form hints) should be written as **neutral statements**, not first-person plural narration.

- Don't use "we", "we'll", "we found", "we couldn't", "we didn't". Don't address the app as if it's a person reporting back.
- Prefer terse statements about state or behaviour: `Resolved /path/to/key`, `No ssh-agent found`, `Falls back to User from ~/.ssh/config`.
- Don't anthropomorphise: `The agent will be queried` is fine, `we'll ask the agent` is not.
- This applies to copy, not to code comments — internal comments may use "we" if it improves clarity.

Examples:

| Avoid                                                   | Prefer                                            |
| ------------------------------------------------------- | ------------------------------------------------- |
| "We found your ssh-agent socket: /tmp/agent.123"        | "ssh-agent socket: /tmp/agent.123"                |
| "We couldn't find an ssh config at /home/u/.ssh/config" | "No ssh config at /home/u/.ssh/config"            |
| "If blank, we use User from ~/.ssh/config"              | "If blank, falls back to User from ~/.ssh/config" |
| "We'll resolve HostName from your config"               | "Resolves HostName from the matching entry"       |

## Path Aliases (Vite/TypeScript)

```typescript
"@" -> "./src"
"@commercial" -> "./src-commercial"
"@shared" -> "./src/shared"
"assets" -> "./src/assets"
"@bksLogger" -> resolved per-build:
  - esbuild main+preload → "./src/lib/log/mainLogger"
  - esbuild utility      → "./src/lib/log/utilityLogger"
  - vite renderer        → "./src/lib/log/rendererLogger"
  - jest                 → "./src/lib/log/mainLogger"
  - tsc / IDE            → "./src/lib/log/bksLogger.d.ts" (ambient declaration; no runtime file)
```

## Database Support

The app supports 15+ databases including PostgreSQL, MySQL, SQLite, SQL Server, Oracle, BigQuery, MongoDB, and more. Database-specific connection logic is in `src/components/connection/` with corresponding client implementations in `src/lib/db/`.

## Documentation Translation Guidelines

The documentation site (`docs/`) uses MkDocs Material with the `mkdocs-static-i18n` plugin for multi-language support. See `mkdocs.yml` for the list of 10 target languages.

### File Structure

Translations use **suffix-based naming**:
- English (default): `filename.md`
- Spanish: `filename.es.md`
- Portuguese (Brazil): `filename.pt-BR.md`
- Other languages: `filename.{locale}.md`

Translation files live alongside the original English files in the same directory.

### Creating Translations

1. **Copy the English file** as a starting point
2. **Keep the same frontmatter structure** (title, summary, icons, etc.) but translate the values
3. **Translate all content** including:
   - Frontmatter `title` and `summary`
   - All body text and headings
   - Alt text for images
   - Admonition titles (e.g., `!!! note "Translated Title"`)
4. **Do NOT translate**:
   - File paths and URLs
   - Code blocks (unless comments need translation)
   - Technical terms that are commonly used in English (e.g., "plugin", "SQL")
   - Brand names (e.g., "Beekeeper Studio", "GitHub")

### Navigation Translations

Add `nav_translations` in `mkdocs.yml` under each language locale to translate menu items:

```yaml
- locale: es
  name: Espanol
  nav_translations:
    Introduction: Introduccion
    Features: Caracteristicas
```

### Adding a New Language

1. Add the locale to `mkdocs.yml` under `plugins > i18n > languages`
2. Include `site_name`, `site_description`, and `nav_translations`
3. Create `.{locale}.md` files for each page in `docs/`
4. Test with `mkdocs serve` from the `studio/` directory

### Finding Files to Translate

English is the primary language. To find all files needing translation for a new language:

1. Scan `docs/` recursively for all `.md` files
2. Exclude files that already have a locale suffix (e.g., `.es.md`, `.de.md`)
3. For each English file found, create the corresponding `.{locale}.md` translation

Example: If you find `docs/user_guide/security.md`, create `docs/user_guide/security.es.md` for Spanish.

### README Translations

The main `README.md` has translations in the repo root using the pattern `README-{locale}.md` or `README.{locale}.md`:
- `README.md` - English (primary)
- `README-es.md` - Spanish
- `README.pt-br.md` - Portuguese (Brazil)

When adding a new README translation:
1. Create `README-{locale}.md` in the repo root
2. Add a link to it in the translation line at the top of `README.md`

The first line of `README.md` links to all translations using the format:
```markdown
🌐 [ES](README-es.md) | [PT-BR](README.pt-br.md)
```
