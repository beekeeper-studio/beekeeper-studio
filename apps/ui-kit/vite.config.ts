import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      vue: "vue/dist/vue.min.js",
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "lib/index.ts"),
      name: "BksUiKit",
      formats: ["es"],
      fileName: () => `[name].js`,
    },
    rollupOptions: {
      input: {
        "index": resolve(__dirname, "lib/components/define.ts"),
        "table": resolve(__dirname, "lib/components/table/define.ts"),
        "table-list": resolve(__dirname, "lib/components/table-list/define.ts"),
        "sql-text-editor": resolve(
          __dirname,
          "lib/components/sql-text-editor/define.ts"
        ),
        "data-editor": resolve(
          __dirname,
          "lib/components/data-editor/define.ts"
        ),
        style: resolve(__dirname, "lib/style.scss"),
      },
    },
    outDir: "dist",
    sourcemap: true,
  },
});
