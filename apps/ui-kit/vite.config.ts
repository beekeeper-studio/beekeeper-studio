import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      vue: "vue/dist/vue.min.js",
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
      entry: resolve(__dirname, "lib/index.ts"),
      name: "BksUiKit",
      formats: ["es"],
      fileName: () => `[name].js`,
    },
    rollupOptions: {
      external: [
        "@codemirror/state",
        "@codemirror/view",
        "@codemirror/language",
        "@codemirror/commands",
        "@codemirror/search",
        "@codemirror/lint",
        "@codemirror/lang-sql",
        "@codemirror/autocomplete",
        "@replit/codemirror-emacs",
        "@replit/codemirror-vim",
        "@marimo-team/codemirror-languageserver",
      ],
      input: {
        style: resolve(__dirname, "lib/style.scss"),
        index: resolve(__dirname, "lib/index.ts"),
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
        "vue/super-formatter": resolve(
          __dirname,
          "lib/components/super-formatter/SuperFormatter.vue"
        ),
        "config/context-menu": resolve(__dirname, "lib/config/context-menu.ts"),
      },
    },
    outDir: "dist",
    sourcemap: true,
  },
});
