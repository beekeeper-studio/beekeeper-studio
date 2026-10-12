import { defineConfig } from "vite";
import vue from "vite-ng-plugin-vue2";
import { resolve } from "path";

// The entries a Vue 2 host imports directly: the root (openMenu mounts with the
// host's Vue) and ./vue/*. A second Vue makes $store undefined in host components.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Aliasing `vue` here would defeat the external below.
      "@": resolve("./lib"),
    },
    dedupe: ["@codemirror/state", "@codemirror/view"],
  },
  optimizeDeps: {
    include: ["@codemirror/state", "@codemirror/view"],
  },
  define: process.env.VITEST ? {} : { global: "navigator" },
  build: {
    // vite.config.ts runs first and clears dist; this pass adds to it.
    emptyOutDir: false,
    lib: {
      entry: {
        index: resolve(__dirname, "lib/index.ts"),
        "vue/table": resolve(__dirname, "lib/components/table/Table.vue"),
        "vue/entity-list": resolve(
          __dirname,
          "lib/components/entity-list/EntityList.vue"
        ),
        "vue/sql-text-editor": resolve(
          __dirname,
          "lib/components/sql-text-editor/SqlTextEditor.vue"
        ),
        "vue/mongo-shell": resolve(
          __dirname,
          "lib/components/mongo-shell/MongoShell.vue"
        ),
        "vue/data-editor": resolve(
          __dirname,
          "lib/components/data-editor/DataEditor.vue"
        ),
        "vue/text-editor": resolve(
          __dirname,
          "lib/components/text-editor/TextEditor.vue"
        ),
        "vue/surreal-text-editor": resolve(
          __dirname,
          "lib/components/surreal-text-editor/SurrealTextEditor.vue"
        ),
        "vue/merge-text-editor": resolve(
          __dirname,
          "lib/components/merge-text-editor/MergeTextEditor.vue"
        ),
        "vue/super-formatter": resolve(
          __dirname,
          "lib/components/super-formatter/SuperFormatter.vue"
        ),
        "vue/tree": resolve(__dirname, "lib/vue/tree.ts"),
      },
      formats: ["es"],
      fileName: () => `[name].js`,
      cssFileName: "style",
    },
    rollupOptions: {
      external: [
        "vue",
        // A second copy of @codemirror/state breaks instanceof checks.
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
