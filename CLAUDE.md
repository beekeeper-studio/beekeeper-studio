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
