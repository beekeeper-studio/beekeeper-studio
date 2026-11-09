#!/usr/bin/env node
import { spawn } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { connectionParam, entityTypesParam, schemaParam } from "./schemas.js";

const BKS_COMMAND = process.env.BKS_PATH || "bks";

interface BksResult {
  code: number;
  stdout: string;
  stderr: string;
}

interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

function runBks(args: string[], stdin?: string): Promise<BksResult> {
  return new Promise((resolve) => {
    const child = spawn(BKS_COMMAND, args, {
      stdio: ["pipe", "pipe", "pipe"],
      // The .cmd wrapper on Windows can only be started through a shell.
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolve({
        code: 1,
        stdout: "",
        stderr:
          `Could not run "${BKS_COMMAND}": ${error.message}. ` +
          "Set BKS_PATH to the bks command bundled with Beekeeper Studio.",
      });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.stdin.end(stdin ?? "");
  });
}

function toToolResult(result: BksResult): ToolResult {
  if (result.code !== 0) {
    return {
      content: [{ type: "text", text: result.stderr.trim() || result.stdout }],
      isError: true,
    };
  }
  return { content: [{ type: "text", text: result.stdout }] };
}

function connectionArgs(connection: string | undefined): string[] {
  if (!connection) {
    return [];
  }
  return ["--connection", connection];
}

function schemaArgs(schema: string | undefined): string[] {
  if (!schema) {
    return [];
  }
  return ["--schema", schema];
}

function entityTypeArgs(entityTypes: string[] | undefined): string[] {
  if (!entityTypes) {
    return [];
  }
  return entityTypes.flatMap((type) => ["--entity-type", type]);
}

async function executeTool(command: "connections"): Promise<ToolResult>;

async function executeTool(
  command: "list-schemas",
  options?: {
    connection?: string;
  },
): Promise<ToolResult>;

async function executeTool(
  command: "list-tables",
  options?: {
    connection?: string;
    schema?: string;
  },
): Promise<ToolResult>;

async function executeTool(
  command: "list-entities",
  options?: {
    connection?: string;
    schema?: string;
    entityTypes?: string[];
  },
): Promise<ToolResult>;

async function executeTool(
  command: "structure",
  options: {
    connection?: string;
    name: string;
    schema?: string;
  },
): Promise<ToolResult>;

async function executeTool(
  command: "query",
  options: {
    connection?: string;
    sql: string;
  },
): Promise<ToolResult>;

async function executeTool(
  command: string,
  options: {
    connection?: string;
    schema?: string;
    entityTypes?: string[];
    name?: string;
    sql?: string;
  } = {},
): Promise<ToolResult> {
  const args: string[] = [command];
  if (options.name) {
    args.push(options.name);
  }
  // SQL goes through stdin so long statements don't hit argv limits.
  if (options.sql !== undefined) {
    args.push("-");
  }
  args.push(
    ...connectionArgs(options.connection),
    ...schemaArgs(options.schema),
    ...entityTypeArgs(options.entityTypes),
  );
  const result = await runBks(args, options.sql);
  return toToolResult(result);
}

function buildServer(): McpServer {
  const server = new McpServer(
    { name: "beekeeper-studio", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    "connections",
    {
      description:
        "List the database connections currently open in the Beekeeper " +
        "Studio desktop app, and whether CLI access is enabled for each.",
      annotations: { readOnlyHint: true },
    },
    async () => await executeTool("connections"),
  );

  server.registerTool(
    "list_schemas",
    {
      description: "List the schemas in the connected database.",
      inputSchema: z.object({ connection: connectionParam }),
      annotations: { readOnlyHint: true },
    },
    async (input) => await executeTool("list-schemas", input),
  );

  server.registerTool(
    "list_tables",
    {
      description: "List the tables in the connected database.",
      inputSchema: z.object({
        connection: connectionParam,
        schema: schemaParam,
      }),
      annotations: { readOnlyHint: true },
    },
    async (input) => await executeTool("list-tables", input),
  );

  server.registerTool(
    "list_entities",
    {
      description:
        "List tables, views, materialized views and routines in the " +
        "connected database.",
      inputSchema: z.object({
        connection: connectionParam,
        schema: schemaParam,
        entityTypes: entityTypesParam,
      }),
      annotations: { readOnlyHint: true },
    },
    async (input) => await executeTool("list-entities", input),
  );

  server.registerTool(
    "structure",
    {
      description:
        "Describe a table or view: columns, keys, indexes, relations, " +
        "triggers and DDL.",
      inputSchema: z.object({
        connection: connectionParam,
        name: z.string().describe("Table or view name."),
        schema: schemaParam,
      }),
      annotations: { readOnlyHint: true },
    },
    async (input) => await executeTool("structure", input),
  );

  server.registerTool(
    "query",
    {
      description:
        "Run a read-only SQL statement (SELECT, SHOW, EXPLAIN, DESCRIBE " +
        "and the like) on the connected database. Writes are rejected. " +
        "Returns at most 20,000 rows.",
      inputSchema: z.object({
        connection: connectionParam,
        sql: z.string().describe("The SQL to run."),
      }),
      annotations: { readOnlyHint: true },
    },
    async (input) => await executeTool("query", input),
  );

  return server;
}

void serveStdio(buildServer);
console.error("[bks-mcp] serving over stdio");
