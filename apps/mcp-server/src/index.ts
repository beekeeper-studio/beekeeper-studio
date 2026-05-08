import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { ApiClient, ApiError } from "./api.js";
import { DiscoveryError } from "./discovery.js";
import { callTool, listTools } from "./tools.js";

const PKG_NAME = "@beekeeperstudio/mcp-server";
const PKG_VERSION = "0.2.0";

async function main(): Promise<void> {
  const api = new ApiClient();
  const server = new Server(
    { name: PKG_NAME, version: PKG_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: listTools() }));

  const TOKEN_HINT =
    "The Beekeeper AI server requires a token. " +
    "Ask the user to open Beekeeper Studio → Tools → AI Server, copy the token from the Overview tab, " +
    "and paste it. Then call the `set_token` tool with that token. " +
    "Alternatively, the user can restart the MCP server with the BEEKEEPER_AI_SERVER_TOKEN env var.";

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    // Pre-flight: most tools need a token when the server requires one. Let
    // `set_token` itself through, plus any tool that hits the unauthenticated
    // /v1/health endpoint indirectly is fine because it'll just succeed.
    if (name !== "set_token") {
      try {
        if (api.requiresToken() && !api.hasToken()) {
          return {
            isError: true,
            content: [{ type: "text", text: TOKEN_HINT }],
          };
        }
      } catch (e) {
        // Discovery failed (server probably not running); fall through so
        // callTool returns the proper DiscoveryError message.
      }
    }

    try {
      const result = await callTool(name, args as Record<string, unknown>, api);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (e) {
      // If the call failed with 401, surface the token hint so Claude knows
      // to ask the user, even if the env-var path was attempted.
      if (e instanceof ApiError && e.status === 401) {
        api.setToken(null);
        return {
          isError: true,
          content: [{ type: "text", text: `${e.message}\n\n${TOKEN_HINT}` }],
        };
      }
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
