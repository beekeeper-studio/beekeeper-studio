import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { ApiClient, ApiError } from "./api.js";
import { DiscoveryError } from "./discovery.js";
import { callTool, listTools } from "./tools.js";

const PKG_NAME = "@beekeeperstudio/mcp-server";
const PKG_VERSION = "0.1.0";

async function main(): Promise<void> {
  const api = new ApiClient();
  const server = new Server(
    { name: PKG_NAME, version: PKG_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listTools() }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      const result = await callTool(name, args as Record<string, unknown>, api);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e) {
      const msg = e instanceof DiscoveryError || e instanceof ApiError
        ? e.message
        : `${(e as Error).message ?? String(e)}`;
      return {
        isError: true,
        content: [{ type: "text", text: msg }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Stay alive until the transport closes (Claude Code drops stdio).
  await new Promise<void>((resolve) => {
    transport.onclose = () => resolve();
  });
}

main().catch((e) => {
  // Surface fatal startup errors on stderr — stdout is reserved for MCP frames.
  process.stderr.write(`beekeeper-mcp fatal: ${e?.stack ?? e}\n`);
  process.exit(1);
});
