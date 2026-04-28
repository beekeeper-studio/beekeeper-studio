import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ApiClient } from "./api.js";

type Json = Record<string, unknown>;

interface ToolDef<TArgs extends Json = Json> {
  tool: Tool;
  call: (args: TArgs, api: ApiClient) => Promise<unknown>;
}

const connectionIdProp = {
  type: "number",
  description: "The Beekeeper Studio saved connection id (see list_connections).",
} as const;

export const TOOLS: Record<string, ToolDef> = {
  server_info: {
    tool: {
      name: "server_info",
      description:
        "Return Beekeeper AI server info: defaults for read-only / max-rows, allowlisted connection ids, and allowlisted saved query ids.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    call: async (_args, api) => api.serverInfo(),
  },

  list_connections: {
    tool: {
      name: "list_connections",
      description:
        "List the saved connections the user has allowlisted for AI access. Each item includes id, name, connectionType, defaultDatabase, readOnly, maxRows.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    call: async (_args, api) => api.listConnections(),
  },

  connect: {
    tool: {
      name: "connect",
      description: "Open the database connection. Idempotent. Run before tools that read schema or run SQL.",
      inputSchema: {
        type: "object",
        properties: { connectionId: connectionIdProp },
        required: ["connectionId"],
        additionalProperties: false,
      },
    },
    call: async (args, api) => api.connect(args.connectionId as number),
  },

  disconnect: {
    tool: {
      name: "disconnect",
      description: "Close the AI session for a connection.",
      inputSchema: {
        type: "object",
        properties: { connectionId: connectionIdProp },
        required: ["connectionId"],
        additionalProperties: false,
      },
    },
    call: async (args, api) => api.disconnect(args.connectionId as number),
  },

  list_databases: {
    tool: {
      name: "list_databases",
      description: "List databases on the server backing this connection.",
      inputSchema: {
        type: "object",
        properties: { connectionId: connectionIdProp },
        required: ["connectionId"],
        additionalProperties: false,
      },
    },
    call: async (args, api) => api.listDatabases(args.connectionId as number),
  },

  list_schemas: {
    tool: {
      name: "list_schemas",
      description: "List schemas in the current (or specified) database.",
      inputSchema: {
        type: "object",
        properties: {
          connectionId: connectionIdProp,
          database: { type: "string", description: "Optional database name filter." },
        },
        required: ["connectionId"],
        additionalProperties: false,
      },
    },
    call: async (args, api) => api.listSchemas(args.connectionId as number, args.database as string | undefined),
  },

  list_tables: {
    tool: {
      name: "list_tables",
      description: "List tables and views, optionally filtered by schema.",
      inputSchema: {
        type: "object",
        properties: {
          connectionId: connectionIdProp,
          schema: { type: "string", description: "Optional schema filter." },
        },
        required: ["connectionId"],
        additionalProperties: false,
      },
    },
    call: async (args, api) => api.listTables(args.connectionId as number, args.schema as string | undefined),
  },

  list_columns: {
    tool: {
      name: "list_columns",
      description: "List columns of a table.",
      inputSchema: {
        type: "object",
        properties: {
          connectionId: connectionIdProp,
          table: { type: "string" },
          schema: { type: "string" },
        },
        required: ["connectionId", "table"],
        additionalProperties: false,
      },
    },
    call: async (args, api) =>
      api.listColumns(args.connectionId as number, args.table as string, args.schema as string | undefined),
  },

  list_keys: {
    tool: {
      name: "list_keys",
      description: "Foreign keys for a table — both incoming (other tables -> this table) and outgoing (this table -> other tables).",
      inputSchema: {
        type: "object",
        properties: {
          connectionId: connectionIdProp,
          table: { type: "string" },
          schema: { type: "string" },
        },
        required: ["connectionId", "table"],
        additionalProperties: false,
      },
    },
    call: async (args, api) =>
      api.listKeys(args.connectionId as number, args.table as string, args.schema as string | undefined),
  },

  sample_table: {
    tool: {
      name: "sample_table",
      description: "Return the first N rows of a table (capped by the user's max-rows setting).",
      inputSchema: {
        type: "object",
        properties: {
          connectionId: connectionIdProp,
          table: { type: "string" },
          schema: { type: "string" },
          limit: { type: "number", description: "Requested row limit. May be reduced by the user's cap." },
        },
        required: ["connectionId", "table"],
        additionalProperties: false,
      },
    },
    call: async (args, api) =>
      api.sampleTable(
        args.connectionId as number,
        args.table as string,
        args.schema as string | undefined,
        args.limit as number | undefined
      ),
  },

  run_query: {
    tool: {
      name: "run_query",
      description:
        "Execute SQL against the connection. The connection's read-only flag is enforced server-side via Beekeeper's existing query identifier — INSERT/UPDATE/DELETE/DDL are rejected when read-only is on. Results are capped at the user's max-rows; the response indicates whether they were truncated.",
      inputSchema: {
        type: "object",
        properties: {
          connectionId: connectionIdProp,
          sql: { type: "string", description: "SQL to run. A single statement is recommended." },
          maxRows: { type: "number", description: "Optional override; the lower of this and the user's cap is used." },
        },
        required: ["connectionId", "sql"],
        additionalProperties: false,
      },
    },
    call: async (args, api) =>
      api.runQuery(args.connectionId as number, args.sql as string, args.maxRows as number | undefined),
  },

  list_saved_queries: {
    tool: {
      name: "list_saved_queries",
      description: "List the user's allowlisted saved (favorite) queries.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    call: async (_args, api) => api.listSavedQueries(),
  },

  get_saved_query: {
    tool: {
      name: "get_saved_query",
      description: "Retrieve the full SQL text of a saved (favorite) query.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
    call: async (args, api) => api.getSavedQuery(args.id as number),
  },

  recent_log: {
    tool: {
      name: "recent_log",
      description: "Recent queries executed by AI clients (audit log).",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "number" } },
        additionalProperties: false,
      },
    },
    call: async (args, api) => api.recentLog(args.limit as number | undefined),
  },
};

export function listTools(): Tool[] {
  return Object.values(TOOLS).map((t) => t.tool);
}

export async function callTool(name: string, args: Json, api: ApiClient): Promise<unknown> {
  const def = TOOLS[name];
  if (!def) throw new Error(`Unknown tool: ${name}`);
  return def.call(args, api);
}
