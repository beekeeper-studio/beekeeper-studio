import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import platformInfo from "@/common/platform_info";
import bksConfig from "@/common/bksConfig";
import { ConnHandlers } from "../handlers/connHandlers";
import { SavedConnection } from "@/common/appdb/models/saved_connection";
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { In } from "typeorm";
import rawLog from "@bksLogger";
import {
  loadGrants,
  isConnectionAllowed,
  isQueryAllowed,
  findConnectionGrant,
  workspaceFilter,
} from "./grants";
import { capResults } from "./rowCapper";
import { resolveSession, AiConnectionError } from "./connectionResolver";
import { append as logAppend } from "./queryLog";
import * as queryLog from "./queryLog";

const log = rawLog.scope("ai-server:router");

export interface RouterContext {
  tokenPrefix: string;
}

interface Route {
  method: "GET" | "POST" | "DELETE";
  pattern: RegExp;
  handler: (
    req: IncomingMessage,
    url: URL,
    params: Record<string, string>,
    body: unknown,
    ctx: RouterContext
  ) => Promise<{ status?: number; body: unknown }>;
}

function effectiveMaxRows(grantMax: number | undefined, requestMax: unknown): number {
  const configMax = Math.max(1, Number(bksConfig.aiServer.maxRows) || 1000);
  let m = configMax;
  if (typeof grantMax === "number" && grantMax > 0) m = Math.min(m, grantMax);
  if (typeof requestMax === "number" && requestMax > 0) m = Math.min(m, requestMax);
  return m;
}

function projectConnection(c: SavedConnection) {
  return {
    id: c.id,
    name: c.name,
    connectionType: c.connectionType,
    defaultDatabase: c.defaultDatabase,
    workspaceId: c.workspaceId,
  };
}

function projectQueryListItem(q: FavoriteQuery) {
  return {
    id: q.id,
    title: q.title,
    excerpt: q.excerpt,
    database: q.database,
  };
}

const routes: Route[] = [
  {
    method: "GET",
    pattern: /^\/v1\/server\/info$/,
    handler: async () => {
      const grants = await loadGrants();
      return {
        body: {
          name: "beekeeper-ai-server",
          version: platformInfo.appVersion,
          host: bksConfig.aiServer.host,
          port: bksConfig.aiServer.port,
          defaultReadOnly: bksConfig.aiServer.defaultReadOnly,
          maxRows: bksConfig.aiServer.maxRows,
          allowedConnections: grants.connections.map((g) => g.connectionId),
          allowedQueries: grants.queries,
          workspaceIds: grants.workspaceIds,
        },
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/connections$/,
    handler: async () => {
      const grants = await loadGrants();
      const ids = grants.connections.map((g) => g.connectionId);
      if (ids.length === 0) return { body: [] };
      const conns = await SavedConnection.findBy({ id: In(ids) });
      const wsFilter = workspaceFilter(grants);
      const filtered = wsFilter ? conns.filter((c) => wsFilter.includes(c.workspaceId)) : conns;
      return {
        body: filtered.map((c) => {
          const grant = findConnectionGrant(grants, c.id);
          return { ...projectConnection(c), readOnly: grant?.readOnly !== false, maxRows: grant?.maxRows ?? null };
        }),
      };
    },
  },
  {
    method: "POST",
    pattern: /^\/v1\/connections\/(\d+)\/connect$/,
    handler: async (_req, _url, params, _body, ctx) => {
      const id = Number(params.id);
      const grants = await loadGrants();
      if (!isConnectionAllowed(grants, id)) throw new AiConnectionError("connection not allowed", 403);
      const grant = findConnectionGrant(grants, id)!;
      const { sId, connection } = await resolveSession(ctx.tokenPrefix, grant);
      return { body: { sessionId: sId, name: connection.name, readOnly: grant.readOnly } };
    },
  },
  {
    method: "POST",
    pattern: /^\/v1\/connections\/(\d+)\/disconnect$/,
    handler: async (_req, _url, params, _body, ctx) => {
      const id = Number(params.id);
      const { forgetSession } = await import("./sessionRegistry");
      forgetSession(ctx.tokenPrefix, id);
      return { body: { ok: true } };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/connections\/(\d+)\/databases$/,
    handler: async (_req, _url, params, _body, ctx) => {
      const id = Number(params.id);
      const grants = await loadGrants();
      if (!isConnectionAllowed(grants, id)) throw new AiConnectionError("connection not allowed", 403);
      const grant = findConnectionGrant(grants, id)!;
      const { sId } = await resolveSession(ctx.tokenPrefix, grant);
      return { body: await ConnHandlers["conn/listDatabases"]({ sId }) };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/connections\/(\d+)\/schemas$/,
    handler: async (_req, _url, params, _body, ctx) => {
      const id = Number(params.id);
      const grants = await loadGrants();
      if (!isConnectionAllowed(grants, id)) throw new AiConnectionError("connection not allowed", 403);
      const grant = findConnectionGrant(grants, id)!;
      const { sId } = await resolveSession(ctx.tokenPrefix, grant);
      return { body: await ConnHandlers["conn/listSchemas"]({ sId }) };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/connections\/(\d+)\/tables$/,
    handler: async (_req, url, params, _body, ctx) => {
      const id = Number(params.id);
      const grants = await loadGrants();
      if (!isConnectionAllowed(grants, id)) throw new AiConnectionError("connection not allowed", 403);
      const grant = findConnectionGrant(grants, id)!;
      const { sId } = await resolveSession(ctx.tokenPrefix, grant);
      const schema = url.searchParams.get("schema") ?? undefined;
      const filter = schema ? { schema } : undefined;
      const tables = await ConnHandlers["conn/listTables"]({ filter, sId });
      const views = await ConnHandlers["conn/listViews"]({ filter, sId }).catch(() => []);
      return { body: [...tables, ...views] };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/connections\/(\d+)\/tables\/([^/]+)\/columns$/,
    handler: async (_req, url, params, _body, ctx) => {
      const id = Number(params.id);
      const grants = await loadGrants();
      if (!isConnectionAllowed(grants, id)) throw new AiConnectionError("connection not allowed", 403);
      const grant = findConnectionGrant(grants, id)!;
      const { sId } = await resolveSession(ctx.tokenPrefix, grant);
      const schema = url.searchParams.get("schema") ?? undefined;
      return {
        body: await ConnHandlers["conn/listTableColumns"]({
          table: decodeURIComponent(params.table),
          schema,
          sId,
        }),
      };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/connections\/(\d+)\/tables\/([^/]+)\/keys$/,
    handler: async (_req, url, params, _body, ctx) => {
      const id = Number(params.id);
      const grants = await loadGrants();
      if (!isConnectionAllowed(grants, id)) throw new AiConnectionError("connection not allowed", 403);
      const grant = findConnectionGrant(grants, id)!;
      const { sId } = await resolveSession(ctx.tokenPrefix, grant);
      const schema = url.searchParams.get("schema") ?? undefined;
      const table = decodeURIComponent(params.table);
      const [out, into] = await Promise.all([
        ConnHandlers["conn/getOutgoingKeys"]({ table, schema, sId }).catch(() => []),
        ConnHandlers["conn/getIncomingKeys"]({ table, schema, sId }).catch(() => []),
      ]);
      return { body: { out, in: into } };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/connections\/(\d+)\/tables\/([^/]+)\/sample$/,
    handler: async (_req, url, params, _body, ctx) => {
      const id = Number(params.id);
      const grants = await loadGrants();
      if (!isConnectionAllowed(grants, id)) throw new AiConnectionError("connection not allowed", 403);
      const grant = findConnectionGrant(grants, id)!;
      const { sId } = await resolveSession(ctx.tokenPrefix, grant);
      const schema = url.searchParams.get("schema") ?? undefined;
      const requestedLimit = Number(url.searchParams.get("limit") ?? "100");
      const limit = effectiveMaxRows(grant.maxRows, requestedLimit);
      const result = await ConnHandlers["conn/selectTop"]({
        table: decodeURIComponent(params.table),
        schema,
        offset: 0,
        limit,
        orderBy: [],
        filters: [],
        sId,
      });
      return { body: result };
    },
  },
  {
    method: "POST",
    pattern: /^\/v1\/connections\/(\d+)\/query$/,
    handler: async (_req, _url, params, body, ctx) => {
      const id = Number(params.id);
      const grants = await loadGrants();
      if (!isConnectionAllowed(grants, id)) throw new AiConnectionError("connection not allowed", 403);
      const grant = findConnectionGrant(grants, id)!;
      const b = (body ?? {}) as { sql?: string; maxRows?: number };
      if (typeof b.sql !== "string" || b.sql.trim().length === 0) {
        throw new AiConnectionError("sql is required", 400);
      }
      const { sId, connection } = await resolveSession(ctx.tokenPrefix, grant);
      const cap = effectiveMaxRows(grant.maxRows, b.maxRows);
      const startedAt = Date.now();
      try {
        const results = await ConnHandlers["conn/executeQuery"]({
          queryText: b.sql,
          options: {},
          sId,
        });
        const capped = capResults(results, cap);
        const durationMs = Date.now() - startedAt;
        logAppend({
          connectionId: id,
          connectionName: connection.name,
          database: connection.defaultDatabase ?? null,
          sql: b.sql,
          rowCount: capped.rowCount,
          truncated: capped.truncated,
          durationMs,
          readOnly: grant.readOnly,
        });
        return {
          body: {
            results: capped.results,
            rowCount: capped.rowCount,
            totalRowCount: capped.totalRowCount,
            truncated: capped.truncated,
            durationMs,
          },
        };
      } catch (e) {
        const durationMs = Date.now() - startedAt;
        logAppend({
          connectionId: id,
          connectionName: connection.name,
          database: connection.defaultDatabase ?? null,
          sql: b.sql,
          rowCount: 0,
          truncated: false,
          durationMs,
          readOnly: grant.readOnly,
          error: (e as Error).message,
        });
        throw e;
      }
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/queries$/,
    handler: async () => {
      const grants = await loadGrants();
      if (grants.queries.length === 0) return { body: [] };
      const list = await FavoriteQuery.findBy({ id: In(grants.queries) });
      return { body: list.map(projectQueryListItem) };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/queries\/(\d+)$/,
    handler: async (_req, _url, params) => {
      const id = Number(params.id);
      const grants = await loadGrants();
      if (!isQueryAllowed(grants, id)) throw new AiConnectionError("query not allowed", 403);
      const q = await FavoriteQuery.createQueryBuilder("q")
        .addSelect("q.text")
        .where("q.id = :id", { id })
        .getOne();
      if (!q) throw new AiConnectionError("query not found", 404);
      return { body: { id: q.id, title: q.title, text: q.text, database: q.database } };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/log$/,
    handler: async (_req, url) => {
      const limit = Number(url.searchParams.get("limit") ?? "100");
      const since = url.searchParams.has("since") ? Number(url.searchParams.get("since")) : undefined;
      return { body: queryLog.recent({ limit, since }) };
    },
  },
];

export async function dispatch(
  method: string,
  pathname: string,
  url: URL,
  req: IncomingMessage,
  body: unknown,
  ctx: RouterContext
): Promise<{ status: number; body: unknown }> {
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.pattern.exec(pathname);
    if (!m) continue;
    const params: Record<string, string> = {};
    // Generic param mapping based on route shape: id, table
    if (m[1] !== undefined) params.id = m[1];
    if (m[2] !== undefined) params.table = m[2];
    try {
      const result = await r.handler(req, url, params, body, ctx);
      return { status: result.status ?? 200, body: result.body };
    } catch (e) {
      if (e instanceof AiConnectionError) {
        return { status: e.status, body: { error: "request_failed", message: e.message } };
      }
      log.error("handler error", pathname, e);
      return { status: 500, body: { error: "internal", message: (e as Error).message } };
    }
  }
  return { status: 404, body: { error: "not_found", message: `${method} ${pathname}` } };
}
