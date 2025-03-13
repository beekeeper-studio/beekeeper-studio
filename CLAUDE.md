# Beekeeper Studio Development Guide

## Build Commands
- Build App: `yarn bks:build` or `yarn electron:build`
- Run Development: `yarn bks:dev` or `yarn electron:serve`
- Run Tests: `yarn test:unit` (unit), `yarn test:integration` (integration), `yarn test:e2e` (e2e)
- Run Single Test: `yarn test:unit -t "test name or pattern"`
- Lint Code: `yarn all:lint` or `yarn workspace beekeeper-studio lint`

## Code Style
- **TypeScript**: Use strict types where possible, configured with `noUnusedLocals` and `noUnusedParameters`
- **Imports**: Use path aliases `@/` for src, `@shared/` for shared, `@commercial/` for commercial code
- **Vue Components**: Use Vue 2.7 with class components and decorators
- **Naming**: PascalCase for components/classes, camelCase for methods/variables, kebab-case for files
- **Error Handling**: Use try/catch blocks and propagate errors appropriately, log with bksLogger
- **CSS/SCSS**: Follow BEM methodology for component styling

## Project Structure
- `/src`: Main application code
- `/src-commercial`: Commercial-only features
- `/shared`: Code shared between packages
- `/tests`: Test files (unit, integration, e2e)

## Development Flow
1. Run `yarn electron:serve` to start development
2. Test your changes with appropriate test commands
3. Run linting before submitting PRs

## Database Client Development
- Database clients extend either `BasicDatabaseClient` or `BaseV1DatabaseClient` (read-only)
- Implement dialect files in `/shared/lib/dialects/` for database-specific SQL syntax
- Client code goes in `/src/lib/db/clients/`
- Connection forms are Vue components in `/src/components/connection/`
- Update `ConnectionTypes` in `/src/lib/db/types.ts` when adding new database support
- Add options interfaces for database-specific config in `types.ts`
- Avoid using `replaceAll()` for string manipulation (use `replace()` instead)
- Use utility functions like `joinFilters()` and `buildSchemaFilter()` for consistency