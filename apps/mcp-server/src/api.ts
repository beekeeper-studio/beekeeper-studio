import { readDiscovery, DiscoveryFile } from "./discovery.js";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface ApiClientOptions {
  /** If set, used instead of reading the discovery file. */
  discovery?: DiscoveryFile;
  /** Force re-read of the discovery file on every request. Defaults to false. */
  refreshOnEach?: boolean;
}

export class ApiClient {
  private cached: DiscoveryFile | null = null;
  private opts: ApiClientOptions;

  constructor(opts: ApiClientOptions = {}) {
    this.opts = opts;
    if (opts.discovery) this.cached = opts.discovery;
  }

  private discovery(): DiscoveryFile {
    if (this.opts.refreshOnEach || !this.cached) {
      this.cached = this.opts.discovery ?? readDiscovery();
    }
    return this.cached;
  }

  resetCache(): void {
    if (!this.opts.discovery) this.cached = null;
  }

  async request<T = unknown>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
    const d = this.discovery();
    const url = new URL(`http://${d.host}:${d.port}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${d.token}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (e: any) {
      // Likely server died or port changed — invalidate cache so next call re-reads.
      this.resetCache();
      throw new ApiError(`Could not reach Beekeeper AI server at ${url}: ${e.message}`, 0);
    }
    const text = await res.text();
    let data: any = null;
    if (text.length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    if (!res.ok) {
      const msg = data?.message || data?.error || res.statusText || "request failed";
      throw new ApiError(`HTTP ${res.status}: ${msg}`, res.status);
    }
    return data as T;
  }

  serverInfo() { return this.request("GET", "/v1/server/info"); }
  health() { return this.request("GET", "/v1/health"); }

  listConnections() { return this.request("GET", "/v1/connections"); }
  connect(id: number) { return this.request("POST", `/v1/connections/${id}/connect`); }
  disconnect(id: number) { return this.request("POST", `/v1/connections/${id}/disconnect`); }
  listDatabases(id: number) { return this.request("GET", `/v1/connections/${id}/databases`); }
  listSchemas(id: number, database?: string) { return this.request("GET", `/v1/connections/${id}/schemas`, undefined, { database }); }
  listTables(id: number, schema?: string) { return this.request("GET", `/v1/connections/${id}/tables`, undefined, { schema }); }
  listColumns(id: number, table: string, schema?: string) {
    return this.request("GET", `/v1/connections/${id}/tables/${encodeURIComponent(table)}/columns`, undefined, { schema });
  }
  listKeys(id: number, table: string, schema?: string) {
    return this.request("GET", `/v1/connections/${id}/tables/${encodeURIComponent(table)}/keys`, undefined, { schema });
  }
  sampleTable(id: number, table: string, schema?: string, limit?: number) {
    return this.request("GET", `/v1/connections/${id}/tables/${encodeURIComponent(table)}/sample`, undefined, { schema, limit });
  }
  runQuery(id: number, sql: string, maxRows?: number) {
    return this.request("POST", `/v1/connections/${id}/query`, { sql, maxRows });
  }
  listSavedQueries() { return this.request("GET", "/v1/queries"); }
  getSavedQuery(id: number) { return this.request("GET", `/v1/queries/${id}`); }
  recentLog(limit?: number) { return this.request("GET", "/v1/log", undefined, { limit }); }
}
