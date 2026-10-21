import { defineConfig } from "vite";
import vue from "vite-ng-plugin-vue2";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve('./lib'),
    },
    dedupe: ["@codemirror/state", "@codemirror/view"],
  },
  optimizeDeps: {
    include: ["@codemirror/state", "@codemirror/view"],
  },
  define: process.env.VITEST ? {} : { global: 'navigator' },
  build: {
    lib: {
      entry: {
        table: resolve(__dirname, "lib/components/table/define.ts"),
        "entity-list": resolve(
          __dirname,
          "lib/components/entity-list/define.ts"
        ),
        "sql-text-editor": resolve(
          __dirname,
          "lib/components/sql-text-editor/define.ts"
        ),
        "mongo-shell": resolve(
          __dirname,
          "lib/components/mongo-shell/define.ts"
        ),
        "mongo-shell/state": resolve(
          __dirname,
          "lib/components/mongo-shell/state.ts"
        ),
        "surreal-text-editor": resolve(
          __dirname,
          "lib/components/surreal-text-editor/define.ts"
        ),
        "data-editor": resolve(
          __dirname,
          "lib/components/data-editor/define.ts"
        ),
        "super-formatter": resolve(
          __dirname,
          "lib/components/super-formatter/define.ts"
        ),
        "text-editor": resolve(
          __dirname,
          "lib/components/text-editor/define.ts"
        ),
        "merge-text-editor": resolve(
          __dirname,
          "lib/components/merge-text-editor/define.ts"
        ),
        tree: resolve(__dirname, "lib/components/tree/define.ts"),
        "context-menu": resolve(
          __dirname,
          "lib/components/context-menu/define.ts"
        ),
        "config/context-menu": resolve(__dirname, "lib/config/context-menu.ts"),
      },
      formats: ["es"],
      fileName: () => `[name].js`,
      cssFileName: "web-components-style",
    },
    rollupOptions: {
      external: [
        // Externalize this because @codemirror/state uses instanceof checks.
        "@codemirror/state",
        "@codemirror/view",
        "@codemirror/language",
        "@codemirror/commands",
        "@codemirror/search",
        "@codemirror/lint",
        "@codemirror/lang-sql",
        "@codemirror/lang-html",
        "@codemirror/lang-javascript",
        "@codemirror/lang-json",
        "@lezer/highlight",
        "@surrealdb/codemirror",
        "@codemirror/autocomplete",
        "@codemirror/merge",
        "@replit/codemirror-emacs",
        "@replit/codemirror-vim",
        "@marimo-team/codemirror-languageserver",
      ],
    },
    outDir: "dist",
    sourcemap: true,
  },
});
