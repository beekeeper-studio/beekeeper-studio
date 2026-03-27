# Implementation Plan: Web Version of Beekeeper Studio

## Overview

Create a web-based version of Beekeeper Studio by extracting the editor UI and database connection logic into separate services that integrate with the existing Rails cloud app.

## Architecture

```
┌─────────────────┐
│   Vue 3 SPA     │ (New - Query Editor App)
│   - ui-kit      │
│   - Pinia       │
└────────┬────────┘
         │ HTTPS/WSS
         ↓
┌─────────────────┐
│  Rails 7.2 API  │ (Existing - Enhanced)
│  - Auth/AuthZ   │
│  - Workspaces   │
│  - Proxy        │
└────────┬────────┘
         │ Internal gRPC/HTTP
         ↓
┌─────────────────┐
│  Node.js Conn   │ (New - Database Service)
│  Service        │
│  - 20+ drivers  │
│  - Pooling      │
│  - SSH tunnels  │
└─────────────────┘
```

## Monorepo Structure

The new projects will live alongside existing apps in the Beekeeper Studio monorepo:

```
studio/                              # Existing monorepo root
├── apps/
│   ├── studio/                      # ✅ Existing - Desktop Electron app
│   ├── ui-kit/                      # ✅ Existing - Shared UI components
│   ├── sqltools/                    # Existing (unused)
│   ├── web-editor/                  # 🆕 NEW - Vue 3 web app
│   └── connection-service/          # 🆕 NEW - Node.js DB service
├── package.json                     # Root workspace config
├── yarn.lock
└── ...
```

**Benefits of monorepo approach:**
- ✅ Share code easily between desktop and web
- ✅ Synchronized versioning
- ✅ Single yarn install for all packages
- ✅ Easier to keep DB drivers up to date
- ✅ Can use workspace protocol (e.g., `@beekeeper/connection-service@workspace:*`)

### Monorepo Build Management

**Current setup:** Yarn workspaces with custom scripts

**Recommended addition:** Turborepo for efficient builds

**Root package.json updates:**
```json
{
  "name": "beekeeper-studio-monorepo",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "scripts": {
    "dev:studio": "yarn workspace @beekeeperstudio/studio electron:serve",
    "dev:web": "yarn workspace @beekeeperstudio/web-editor dev",
    "dev:connection-service": "yarn workspace @beekeeperstudio/connection-service dev",
    "build:all": "turbo run build",
    "build:web": "turbo run build --filter=@beekeeperstudio/web-editor",
    "build:connection-service": "turbo run build --filter=@beekeeperstudio/connection-service",
    "test:all": "turbo run test",
    "lint:all": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^1.10.0"
  }
}
```

**Turborepo config (turbo.json):**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {}
  }
}
```

**Why Turborepo?**
- ✅ Caching: Only rebuilds changed packages
- ✅ Parallelization: Runs tasks in parallel where possible
- ✅ Dependency awareness: Builds in correct order
- ✅ Simple: Works with existing Yarn workspaces
- ✅ Optional: Can keep existing scripts, Turbo is additive

**Alternative:** Keep current Yarn workspace scripts if you prefer simplicity

## Phase 1: Extract Database Connection Service (2-3 weeks)

### 1.1 Create Package Structure

Create new workspace: `apps/connection-service/`

**Directory structure:**
```
apps/connection-service/
├── src/
│   ├── server.ts              # Main Express/Fastify server
│   ├── api/
│   │   ├── routes.ts
│   │   └── controllers/
│   ├── db/                    # Extracted from Beekeeper
│   │   ├── clients/           # All 20+ database clients
│   │   ├── server.ts
│   │   ├── tunnel.ts
│   │   └── types.ts
│   ├── services/
│   │   ├── ConnectionManager.ts
│   │   └── QueryService.ts
│   └── utils/
├── Dockerfile
├── package.json
└── tsconfig.json
```

### 1.2 Extract Core Files from Beekeeper Studio

**Copy these files maintaining directory structure:**

1. **Database Clients** (from `apps/studio/`):
   - `src/lib/db/clients/*` - All client implementations
   - `src/lib/db/types.ts` - Type definitions
   - `src/lib/db/models.ts` - Data models
   - `src/lib/db/tunnel.ts` - SSH tunneling
   - `src/lib/db/serialization/transcoders.ts` - Binary data handling
   - `src-commercial/backend/lib/db/clients/*` - Commercial clients (Oracle, MongoDB, etc.)
   - `src-commercial/backend/lib/db/server.ts` - Server factory
   - `src-commercial/backend/lib/db/client.ts` - Client factory
   - `src-commercial/backend/lib/connection-provider.ts` - Connection management
   - `src/vendor/node-ssh-forward/` - SSH tunnel library

2. **Update imports** to remove Electron dependencies (ipcRenderer, MessagePort)

3. **Copy dependencies** to package.json:
   - Database drivers: pg, mysql2, mssql, mongodb, oracledb, better-sqlite3, etc. (20+ packages)
   - Supporting: knex, ssh2, sql-formatter, sql-query-identifier

### 1.3 Build HTTP API

**Key endpoints:**
```typescript
POST /connections/test         // Test connection
POST /connections/create       // Create pooled connection
POST /query/execute           // Execute query
GET  /query/stream/:id        // Stream large results (SSE)
POST /schema/tables           // List tables
POST /schema/columns          // List columns
POST /connections/disconnect  // Close connection
```

**Features:**
- Internal authentication (shared secret with Rails)
- Connection pooling (per-user, per-connection)
- Query streaming via Server-Sent Events
- SSH tunnel management
- Binary data serialization (Base64)

### 1.4 Docker Setup

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++ postgresql-dev mysql-dev
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### 1.5 Testing

- Unit tests for each database client
- Integration tests with Docker test databases
- Load testing (100 concurrent connections)

## Phase 2: Enhance Rails API (2 weeks)

### 2.1 New Controllers

Create in `~/Projects/beekeeper-studio/cloud/`:

**Files to create:**
- `app/controllers/api/v1/query_controller.rb` - Query execution
- `app/controllers/api/v1/schema_controller.rb` - Schema introspection
- `app/controllers/internal/connections_controller.rb` - Internal credential decryption
- `lib/connection_service_client.rb` - HTTP client for Connection Service

**Files to modify:**
- `config/routes.rb` - Add new routes
- `app/controllers/api/v1/connections_controller.rb` - Add test/connect endpoints
- `app/models/connection.rb` - Add connection service metadata

### 2.2 Key Implementations

**Query Execution Flow:**
1. Vue SPA → `POST /api/v1/query/execute`
2. Rails validates auth + workspace membership
3. Rails retrieves encrypted credentials (lockbox)
4. Rails calls Connection Service via `ConnectionServiceClient`
5. Connection Service executes query
6. Rails proxies results back to Vue SPA

**WebSocket Support (Optional):**
- Use ActionCable for streaming large results
- Background job for long-running queries

### 2.3 Authorization

Add Pundit policies for workspace-scoped access:
```ruby
# app/policies/connection_policy.rb
def execute_query?
  user.workspaces.include?(record.workspace)
end
```

## Phase 3: Build Vue SPA (3-4 weeks)

### 3.1 Create Vue 3 Project

Create new workspace: `apps/web-editor/`

**Setup:**
- Vue 3 with Composition API
- Vite for build tooling
- Pinia for state management
- Vue Router for routing
- TypeScript

**Install dependencies:**
```bash
npm install vue@3 pinia vue-router @beekeeperstudio/ui-kit
npm install @vueuse/core axios
```

### 3.2 Core Components

**Create these Vue components:**

1. **WorkspaceSelector.vue**
   - List workspaces
   - Switch workspace
   - Calls: `GET /api/workspaces`

2. **ConnectionList.vue**
   - List connections in workspace
   - Create/edit/delete connections
   - Test connection
   - Calls: `GET /api/workspaces/:id/connections`

3. **QueryEditor.vue** ⭐ Main interface
   - Uses `SqlTextEditor` from `@beekeeperstudio/ui-kit`
   - Query tabs
   - Run query button
   - Uses `ResultTable` from ui-kit for results
   - Calls: `POST /api/query/execute`

4. **TableBrowser.vue**
   - Uses `EntityList` from ui-kit
   - Schema tree (databases → tables → columns)
   - Calls: `POST /api/schema/tables`, `POST /api/schema/columns`

5. **ConnectionForm.vue**
   - Database-specific connection forms
   - Reuse logic from Beekeeper's connection components
   - SSH/SSL configuration

### 3.3 State Management (Pinia)

```typescript
// stores/connection.ts
- connections: Connection[]
- currentConnection: Connection | null
- schema: { tables, views, columns }
- loadConnections(workspaceId)
- connect(connectionId)
- disconnect()

// stores/query.ts
- tabs: QueryTab[]
- activeTabId: number
- currentResults: QueryResult
- executeQuery(query, connectionId)
- cancelQuery()

// stores/auth.ts
- user: User
- token: string
- workspaces: Workspace[]
- login(email, password)
- logout()
```

### 3.4 Integration with @beekeeperstudio/ui-kit

**Key components to use:**
- `SqlTextEditor` - SQL editor with CodeMirror 6, autocomplete, syntax highlighting
- `ResultTable` - Tabulator-based data grid
- `EntityList` - Schema tree component
- `SuperFormatter` - SQL formatter UI

**Usage example:**
```vue
<template>
  <SqlTextEditor
    v-model="query"
    :entities="tables"
    :dialect="connectionType"
    @bks-query-selection-change="handleSelection"
  />
  <ResultTable
    :data="results.rows"
    :columns="results.fields"
  />
</template>
```

### 3.5 Routing

```typescript
// router/index.ts
/login                          - Login page
/workspaces                     - Workspace selector
/workspace/:id/connections      - Connection list
/workspace/:id/query/:connId    - Query editor (main interface)
/workspace/:id/table/:table     - Table browser
```

### 3.6 Authentication

- Login via Rails API: `POST /api/sessions/login`
- Store JWT/token in localStorage
- Include in all API requests via Axios interceptor
- Handle 401 → redirect to login

### 3.7 Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8080,
    proxy: {
      '/api': 'http://localhost:3000',  // Rails
      '/cable': { target: 'ws://localhost:3000', ws: true }
    }
  }
});
```

## Phase 4: Integration & Deployment (1-2 weeks)

### 4.1 Connection Service Deployment

**Deploy to:**
- Docker container
- Internal network only (not public)
- Environment variables:
  - `INTERNAL_AUTH_SECRET` - Shared with Rails
  - `RAILS_API_URL` - For credential retrieval
  - `MAX_CONNECTIONS=1000`
  - `CONNECTION_IDLE_TIMEOUT=1800000` (30 min)

**Monitoring:**
- Health checks: `/health`, `/ready`
- Metrics: connection pool size, query latency, error rate
- Logs: Structured JSON with correlation IDs

### 4.2 Vue SPA Deployment

**Options:**
1. Static hosting (S3 + CloudFront, Netlify, Vercel)
2. Nginx serving static files
3. Integrated with Rails (serve from `/public/`)

**Build:**
```bash
npm run build  # → dist/
```

**Environment:**
- `VITE_API_URL` - Rails API endpoint

### 4.3 Rails Configuration

**Environment variables:**
```bash
CONNECTION_SERVICE_URL=http://connection-service:3001
INTERNAL_API_TOKEN=<shared-secret>
```

**CORS (already configured):**
- Allow Vue SPA origin
- Allow credentials

## Phase 5: Testing & Rollout (2 weeks)

### 5.1 End-to-End Testing

1. Test all 20+ database types
2. Test SSH tunneling
3. Test SSL/TLS connections
4. Test concurrent users
5. Test large result sets (streaming)
6. Test error scenarios
7. Security testing

### 5.2 Beta Testing

1. Internal team testing
2. Select customer beta
3. Gather feedback
4. Fix critical bugs

### 5.3 Production Rollout

1. Deploy Connection Service
2. Deploy Vue SPA
3. Enable feature flag in Rails
4. Monitor metrics
5. Gradual rollout to all users

## Critical Files Reference

### From Beekeeper Studio (to extract):

**Database Logic:**
- `apps/studio/src/lib/db/clients/BasicDatabaseClient.ts` (691 lines) - Base class
- `apps/studio/src/lib/db/clients/postgresql.ts` (1,818 lines) - Reference impl
- `apps/studio/src/lib/db/types.ts` - Type definitions
- `apps/studio/src/lib/db/tunnel.ts` - SSH tunneling
- `apps/studio/src-commercial/backend/lib/db/server.ts` - Server factory
- `apps/studio/src-commercial/backend/lib/db/client.ts` - Client factory
- `apps/studio/src-commercial/backend/handlers/connHandlers.ts` - Handler pattern reference

**UI Components:**
- Already packaged as `@beekeeperstudio/ui-kit` npm package
- Just `npm install @beekeeperstudio/ui-kit`

### In Rails Cloud App (to modify):

**Existing:**
- `~/Projects/beekeeper-studio/cloud/app/models/connection.rb` - Connection model (already stores credentials)
- `~/Projects/beekeeper-studio/cloud/config/routes.rb` - Add routes
- `~/Projects/beekeeper-studio/cloud/app/controllers/api_controller.rb` - Base API controller

**To Create:**
- `app/controllers/api/v1/query_controller.rb`
- `app/controllers/api/v1/schema_controller.rb`
- `app/controllers/internal/connections_controller.rb`
- `lib/connection_service_client.rb`

## Key Technical Decisions

### 1. Database Driver Dependencies
- All 20+ drivers in Connection Service Docker image
- Multi-stage build for native dependencies
- Alpine Linux with build tools

### 2. Binary Data Serialization
- Use existing Beekeeper transcoders
- Base64 encode for JSON transport
- Stream large BLOBs via presigned URLs (future)

### 3. Result Streaming
- Server-Sent Events (SSE) for large result sets
- Reuse existing cursor implementations from Beekeeper
- Chunk size: 1000 rows

### 4. Connection Pooling
- Per-user, per-connection isolation
- Max 5 connections per user
- 30-minute idle timeout
- Health checks every 5 minutes

### 5. Security
- Connection Service internal only (no public access)
- Shared secret authentication with Rails
- Credentials encrypted at rest (lockbox)
- All queries logged for audit

### 6. Error Handling
- Structured error codes (CONNECTION_*, QUERY_*, INTERNAL_*)
- User-friendly messages in Vue SPA
- Detailed logs for debugging

## Timeline

- **Phase 1: Connection Service** - 2-3 weeks
- **Phase 2: Rails API** - 2 weeks
- **Phase 3: Vue SPA** - 3-4 weeks
- **Phase 4: Integration** - 1-2 weeks
- **Phase 5: Testing & Rollout** - 2 weeks

**Total: 10-13 weeks**

## Success Criteria

- ✅ Users can sign up and log in via web
- ✅ Users can create connections to 20+ database types
- ✅ Users can write and execute SQL queries
- ✅ Query results display in identical UI as Desktop app
- ✅ SSH tunneling works for secure connections
- ✅ Large result sets stream without timeout
- ✅ Multi-user/workspace isolation works correctly
- ✅ Performance: <2s for typical query execution
- ✅ No credential leakage or security issues

## Next Steps

1. **Set up monorepo build tools** - Add Turborepo (optional)
2. **Extract database clients** to `apps/connection-service/`
3. **Build minimal HTTP API** for connection testing
4. **Test with PostgreSQL** end-to-end
5. **Add remaining database drivers** iteratively
6. **Build Vue SPA** in parallel with Connection Service
7. **Integrate with Rails** once both are working
8. **Deploy to staging** for testing
9. **Beta test** with real users
10. **Production rollout**

## Notes

- The existing `@beekeeperstudio/ui-kit` package makes UI reuse straightforward
- Database connection logic is already pure Node.js (no Electron dependencies)
- Rails cloud app already has connection storage and encryption
- Architecture matches Electron's utility process pattern (just HTTP instead of MessagePort)
- SSH tunneling and connection pooling code can be reused as-is
