import { defineConfig } from "vite";
import { resolve } from "path";

/**
 * Dev server config for the examples. Each demo is a Vite multi-page entry
 * served from `examples/`. The built worker (`dist/worker.js`) is loaded
 * by URL — so the lib must be built once before running the dev server
 * (`yarn build` from this workspace, or `yarn examples:dev` which chains
 * both).
 */
export default defineConfig({
  root: resolve(__dirname),
  base: "./",
  resolve: {
    alias: {
      "@": resolve(__dirname, "../lib"),
    },
  },
  server: {
    port: 5174,
    open: "/index.html",
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        "sqlite-demo": resolve(__dirname, "sqlite-demo/index.html"),
        "raw-demo": resolve(__dirname, "raw-demo/index.html"),
      },
    },
  },
});
