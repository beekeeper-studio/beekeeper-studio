# @beekeeperstudio/plugin

A tiny wrapper of `window.postMessage` for building Beekeeper Studio plugins with TypeScript support.

## Installation

```bash
npm install @beekeeperstudio/plugin
# or
yarn add @beekeeperstudio/plugin
```

## Quick Start

```typescript
import { getTables, runQuery } from '@beekeeperstudio/plugin';

// Get all tables in the current database
const tables = await getTables();

// Run a SQL query
const result = await runQuery({ query: 'SELECT * FROM users LIMIT 10' });
```

## Development

```bash
# Build the library
npm run build

# Prepare for publishing
npm run prepublishOnly
```

## License

MIT
