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

## Path Aliases (Vite/TypeScript)

```typescript
"@" -> "./src"
"@commercial" -> "./src-commercial"
"@shared" -> "./src/shared"
"assets" -> "./src/assets"
"@bksLogger" -> "./src/lib/log/rendererLogger"
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
