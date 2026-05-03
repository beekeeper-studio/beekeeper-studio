import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./lib"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "lib/index.ts"),
        worker: resolve(__dirname, "lib/server/worker.ts"),
      },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      output: {
        // The worker bundle must be a single self-contained file (no dynamic
        // chunking) so consumers can `new Worker(new URL(...))` it directly.
        inlineDynamicImports: false,
        manualChunks: undefined,
      },
    },
    outDir: "dist",
    sourcemap: true,
    emptyOutDir: true,
    target: "es2020",
  },
});
