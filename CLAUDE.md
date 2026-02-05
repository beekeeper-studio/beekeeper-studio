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
- **App Configuration**: `apps/studio/default.config.ini` (default user-configurable settings)

## Application Configuration System

Beekeeper Studio uses an INI-based configuration system for user-configurable settings. This allows users to customize behavior through config files.

### Adding New Configuration Options

**1. Add to `apps/studio/default.config.ini`**

Configuration settings are organized into sections. Common sections include:
- `[ui.queryEditor]` - Query editor settings
- `[ui.tableTable]` - Table view settings
- `[security]` - Security settings
- `[db.default]` - Default database settings
- `[db.postgres]`, `[db.mysql]`, etc. - Database-specific settings

Example of adding a new setting:
```ini
[ui.queryEditor]
maxResults = 50000
defaultFormatter = bk-default
; Parameter sorting mode for query parameter input modal
; Options: 'insertion' (default) or 'alphanumeric'
; insertion: displays parameters in query order (:1, :10, :2)
; alphanumeric: sorts with smart numeric handling (:1, :2, :10)
parameterSortMode = insertion
```

**2. Add a getter in the Settings Store**

Add a getter in `src/store/modules/settings/SettingStoreModule.ts`:
```typescript
parameterSortMode(state) {
  if (!state.settings.parameterSortMode) return 'insertion'
  const value = state.settings.parameterSortMode.value as string
  return (value === 'alphanumeric' || value === 'insertion') ? value : 'insertion'
}
```

**3. Access the setting in components**
```typescript
// In a Vue component
const sortMode = this.$store.getters['settings/parameterSortMode']
```

### Documenting Configuration in User Docs

**Use the `ini-include` plugin** to reference configuration from `default.config.ini`:

**Option 1: Include entire config file**
```markdown
{% ini-include %}
```

**Option 2: Include specific section**
```markdown
{% ini-include section="ui.queryEditor" %}
```

**Option 3: Include specific database section**
```markdown
{% ini-include section="db.postgres" %}
```

**Best Practices:**
- Create reusable include files in `docs/includes/` for configuration snippets
- Use `{% include-markdown %}` to include these files in multiple places
- Always include both English and translated versions (`.es.md`, etc.)
- Add explanatory text before the ini-include to provide context

**Example include file** (`docs/includes/parameter_sort_mode_config.md`):
```markdown
You can configure the parameter sorting mode using the [config file](../user_guide/configuration.md):

{% ini-include section="ui.queryEditor" %}
```

**Using the include in documentation:**
```markdown
### Parameter Sorting Configuration

{% include-markdown '../../includes/parameter_sort_mode_config.md'%}
```

This approach:
- ✅ Keeps documentation in sync with actual config
- ✅ Avoids hard-coding INI snippets that can go stale
- ✅ Shows users the exact config section they need
- ✅ Includes comments from the default config

## Running Tests

Always run tests from the appropriate directory:
- From root: `yarn test:unit`, `yarn test:integration`, `yarn test:e2e`
- From apps/studio: `yarn test:unit`, `yarn test:integration`, `yarn test:e2e`

Test files are organized in `apps/studio/tests/`:
- `unit/` - Unit tests
- `integration/` - Integration tests
- `e2e/` - End-to-end tests with Playwright

### Testing Tips & Best Practices

**IMPORTANT: Build UI Kit First**
- If you get module resolution errors for `@beekeeperstudio/ui-kit` when running tests, build the library first:
  ```bash
  yarn lib:build  # From project root
  ```
- This is especially important after pulling changes or when testing components that use ui-kit

**Running Single Integration Tests**
- The full integration test suite takes a long time to run (50+ seconds)
- Run individual test files for faster feedback:
  ```bash
  # From apps/studio/
  yarn test:integration tests/integration/lib/db/clients/postgres.spec.ts
  yarn test:integration tests/integration/lib/db/clients/sqlite.spec.js
  ```
- This is much faster than running the entire suite

**Component Testing Challenges**
- Complex components with many dependencies (like `TabQueryEditor.vue`) are difficult to mount in unit tests
- Consider creating focused unit tests for utility functions instead of full component tests
- Example: Test the logic in `src/lib/db/` rather than mounting the entire component
- Use the `Task` tool with `subagent_type=Explore` when you need to understand component dependencies

**Test Organization**
- Unit tests for utilities belong in `tests/unit/lib/`
- Component logic tests can be in `tests/unit/lib/` if they test pure functions
- Only create component tests in `tests/unit/components/` if absolutely necessary
- Integration tests verify database-specific functionality

**Running Specific Test Patterns**
```bash
# Run tests matching a pattern
yarn test:unit tests/unit/lib/parameter-sorting.spec.ts
yarn test:unit tests/unit/lib/query-parameter-ordering.spec.js

# Run all tests in a directory
yarn test:unit tests/unit/lib/

# View test output with tail for long-running tests
yarn test:integration tests/integration/lib/db/clients/postgres.spec.ts 2>&1 | tail -100
```

## Development Workflow

1. **Setup**: `yarn install` from root
2. **Start development**: `yarn bks:dev` (from root) or `yarn electron:serve` (from apps/studio)
3. **Run tests**: `yarn test:unit` before committing
4. **Build**: `yarn bks:build` for production build

### Development Tips

**Settings and Configuration**
- User settings are stored in `src/store/modules/settings/SettingStoreModule.ts`
- Add new settings by:
  1. Creating a getter in `SettingStoreModule.ts` (e.g., `parameterSortMode`)
  2. Using the setting via `this.$store.getters['settings/yourSetting']`
  3. Saving settings with `this.$store.dispatch('settings/save', { key: 'yourKey', value: 'yourValue' })`
- Settings are persisted to the app's SQLite database automatically

**Creating Utility Functions**
- Place reusable logic in `src/lib/` organized by feature
- Example: Database utilities in `src/lib/db/`, editor utilities in `src/lib/editor/`
- Export TypeScript types alongside functions for better type safety
- Always write unit tests for utility functions in `tests/unit/lib/`

**Working with Vue Components**
- Component files can be very large (e.g., `TabQueryEditor.vue` is 1000+ lines)
- Use `Read` tool with offset/limit to view specific sections
- Look for computed properties, methods, and lifecycle hooks
- Check imports to understand dependencies

**Vuex Store Access**
- Use `mapGetters`, `mapState` from `vuex` in components
- Access getters: `this.$store.getters['module/getter']`
- Dispatch actions: `this.$store.dispatch('module/action', payload)`
- Direct state access: `this.$store.state.module.property`

**Path Aliases**
- Use `@/` for imports from `src/` (e.g., `import { foo } from '@/lib/utils'`)
- Use `@commercial/` for imports from `src-commercial/`
- Aliases are configured in `tsconfig.json` and `vite.config.mjs`

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

## Common Issues & Troubleshooting

### Module Resolution Errors

**Problem**: `Cannot find module '@beekeeperstudio/ui-kit/vue/...'`

**Solution**: Build the ui-kit library first:
```bash
yarn lib:build  # From project root
```

This happens because the ui-kit is a local workspace dependency that needs to be built before components can import from it.

### Test Failures Due to Dependencies

**Problem**: Component tests fail with missing module errors or undefined methods

**Solution**:
- Don't test complex components directly - test their utility functions instead
- Create focused unit tests for business logic in `src/lib/`
- Use mocks sparingly - prefer testing pure functions
- Example: Test `parameter-sorting.ts` logic rather than mounting `TabQueryEditor.vue`

### Long-Running Test Suites

**Problem**: Integration test suites take too long (50+ seconds)

**Solution**:
- Run individual test files: `yarn test:integration tests/integration/lib/db/clients/postgres.spec.ts`
- Use background tasks for long operations and check results later
- Pipe output to `tail` to see just the summary: `yarn test:integration ... 2>&1 | tail -100`

### TypeScript Type Errors in Vue Files

**Problem**: Type errors when accessing store or using Vue features

**Solution**:
- Use proper type annotations: `this.$store.getters['settings/foo'] as YourType`
- Check `tsconfig.json` for path alias configuration
- Import types from the right location (e.g., `import { ParameterSortMode } from '../lib/db/parameter-sorting'`)

### Working Directory Issues

**Problem**: Commands fail because you're in the wrong directory

**Solution**:
- Stay in `/apps/studio` when working on the main app
- Only run commands from project root when explicitly needed (e.g., `yarn lib:build`)
- Use absolute paths in tools when possible to avoid directory confusion

### Debugging Integration Tests

**Problem**: Integration tests fail but you can't see what's wrong

**Solution**:
- Look for test output in background task output files
- Run single test file to isolate issues
- Check database-specific test files in `tests/integration/lib/db/clients/`
- Review test setup in `tests/lib/db.ts` for common test patterns

### Browser Data Warning

**Problem**: Warning about `browserslist: caniuse-lite is 12 months old`

**Solution**:
- This is just a warning and can be ignored
- To fix: `npx update-browserslist-db@latest` (optional)
