# Beekeeper Studio Dev Commands

## Build & Run
- Build app: `yarn electron:build` - use `--linux AppImage` for quick Linux builds
- Dev mode: `yarn electron:serve` (not recommended)
- Build config: `yarn config:build`

## Tests
- Unit tests: `yarn test:unit`
- Single test: `yarn test:unit -t "test name pattern"`
- E2E tests: `yarn test:e2e`
- Integration tests: `yarn test:integration`
- CodeMirror tests: `yarn test:codemirror`

## Lint
- Lint studio app: `yarn lint`
- Lint all: `yarn all:lint`

## Structure
- Electron app with frontend (Vue, renderer.ts) and backend (main.ts/utility.ts)
- Use @bksLogger for logging
- No native code in the frontend

## Code Style
- TypeScript with Vue 2.7 components using class-based Vue decorators
- Use absolute imports with aliases (`@/*`, `@shared/*`, `@commercial/*`)
- Follow Vue's style guide with PascalCase for components, camelCase for variables
- Use typed interfaces for data models and props
- Handle async operations with proper error handling
- Use SCSS for styling; prefer functional programming with lodash