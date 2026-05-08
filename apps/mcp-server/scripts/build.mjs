// Bundle the MCP server into a single self-contained dist/index.js so it can
// be shipped without node_modules. esbuild inlines the @modelcontextprotocol
// SDK and zod, which are otherwise hoisted to the workspace root.

import { build, context } from "esbuild";
import { chmodSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const watch = process.argv.includes("--watch");

const distDir = resolve("dist");
mkdirSync(distDir, { recursive: true });

const opts = {
  entryPoints: [resolve("src/index.ts")],
  outfile: resolve("dist/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  banner: { js: "#!/usr/bin/env node" },
  // Make the ESM bundle work in Node by providing common require/__dirname.
  define: {},
  // The MCP SDK uses dynamic require / json — keep node built-ins external.
  external: [],
  sourcemap: true,
  legalComments: "external",
  logLevel: "info",
};

async function postProcess() {
  chmodSync(opts.outfile, 0o755);
  // Drop a tiny package.json in dist so Node treats the file as ESM
  // when invoked directly without going through the parent package.json.
  if (!existsSync(resolve("dist/package.json"))) {
    writeFileSync(resolve("dist/package.json"), JSON.stringify({ type: "module" }, null, 2) + "\n");
  }
}

if (watch) {
  const ctx = await context(opts);
  await ctx.watch();
  console.log("watching apps/mcp-server...");
} else {
  await build(opts);
  await postProcess();
}
