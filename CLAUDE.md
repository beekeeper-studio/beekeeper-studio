# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beekeeper Studio is a cross-platform SQL editor and database manager, available for Linux, Mac, and Windows. It supports numerous database systems including PostgreSQL, MySQL, SQLite, SQL Server, and more.

## Project Structure

This is a monorepo organized as follows:

- `/apps/studio/` - The main Beekeeper Studio application
- `/apps/ui-kit/` - Shared UI component library
- `/shared/` - Shared code used across different packages

### Main Application Structure

Inside `/apps/studio/src/`:

- `src/background/` - Electron-side code (main process)
- `src/components/` - Vue components
- `src/lib/` - Core business logic and database drivers
- `src/common/` - Shared utilities and interfaces
- `src/store/` - Vuex store modules
- `src/assets/` - Static assets (styles, fonts, etc.)
- `src/frontend/` - Frontend-only helpers
- `src/handlers/` - Message handlers for IPC communication
- `src/migration/` - Database migration scripts for local app storage

### Main Screens/Components

- `ConnectionInterface.vue` - The connection screen for connecting to databases
- `CoreInterface.vue` - The main database interaction screen
- App entry points:
  - `background.js` - Electron main process
  - `main.js` - Vue application entry point

## Development Workflow

### Building and Running

```bash
# Install dependencies
yarn install

# Development mode
yarn electron:serve

# Build application
yarn build

# Build and package as an electron app
yarn electron:build
```

### Code Conventions

1. **TypeScript**
   - All new code should be written in TypeScript
   - Properly define interfaces for data structures
   - Use proper type annotations for function parameters and return values

2. **Vue Components**
   - Use Vue Class Component style for new components
   - Keep components small and focused on a single responsibility
   - Prefer computed properties over methods for derived data
   - Use props with proper validation

3. **Error Handling**
   - Use friendly error messages for common user errors
   - Implement appropriate error handling patterns
   - Use the FriendlyErrorHelper for database connection errors

4. **Database Operations**
   - Keep database-specific code in the appropriate client folders
   - Handle transaction management properly

5. **Styling**
   - Use SCSS for styling
   - Follow the existing naming conventions for CSS classes
   - Use the existing variables in `_variables.scss`

## Testing Structure

### Test Types

1. **Unit Tests**
   - Located in `/apps/studio/tests/unit/`
   - Focus on testing individual components, utilities, and functions in isolation
   - Do not require a database or external dependencies
   - Run with `yarn test:unit` or `cd apps/studio && yarn test:unit`
   - For testing a specific file: `cd apps/studio && yarn test:unit path/to/test.spec.ts`

2. **Integration Tests**
   - Located in `/apps/studio/tests/integration/`
   - Test interactions between components or with databases
   - Require Docker containers for database testing (using testcontainers)
   - Run with `yarn test:integration` or `cd apps/studio && yarn test:integration`
   - For testing a specific file: `cd apps/studio && yarn test:integration path/to/test.spec.ts`

3. **CodeMirror Tests**
   - Specialized tests for the CodeMirror editor integration
   - Run with `yarn test:codemirror` or `cd apps/studio && yarn test:codemirror`

### Test Naming and Structure

- Test files should be named with `.spec.js` or `.spec.ts` extension
- Tests use Jest as the testing framework
- Use `describe` blocks to group related tests
- Use `it` or `test` for individual test cases
- Mirror the source file structure in the test directory

### Test Utilities

- `/apps/studio/tests/lib/` contains testing utilities and helpers

### Creating New Tests

1. Match the directory structure of the source file you're testing
2. Follow existing test patterns and conventions
3. Use `expect()` assertions for validation
4. Mock dependencies when necessary

### Running Tests

- Run all tests: `yarn test`
- Run unit tests: `yarn test:unit`
- Run integration tests: `yarn test:integration`
- Run a specific test file: `yarn test:unit path/to/test.spec.ts`
- Run tests with a specific name pattern: `yarn test:unit -t "pattern"`

## Common Development Tasks

### Linting and Type Checking

```bash
# Run linter
cd apps/studio && yarn lint

# Check TypeScript types
tsc --noEmit
```

### Adding Support for a New Database

1. Create a new client in `src/lib/db/clients/`
2. Add the database to the list in `src/lib/db/types.ts`
3. Create UI components for connection in `src/components/connection/`
4. Update documentation and supported database list

### IPC Communication Pattern

Beekeeper Studio uses an IPC (Inter-Process Communication) pattern where:
- Front-end components send messages via `this.$util.send('channel', payload)`
- Background process handles these in the appropriate handler in `src/handlers/`
- Responses are sent back to the front-end

### Community vs Ultimate Features

Beekeeper has community (free) and ultimate (paid) editions:
- Community features are available to all users
- Ultimate features require a license
- Use `isUltimate` and `isUltimateType` checks for feature gating

## Additional Resources

- [Documentation](https://docs.beekeeperstudio.io)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](code_of_conduct.md)