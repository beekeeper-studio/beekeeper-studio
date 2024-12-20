import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";
import { resolve } from "path";

const target = process.env.TARGET as string; // sql-text-editor
if (typeof target === "undefined")
  throw new Error("Please set TARGET environment variable");

function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

const componentName = target.split("-").map(capitalizeFirstLetter).join(""); // SqlTextEditor
const componentPath = resolve(
  __dirname,
  `lib/components/${componentName}/index.ts` // lib/components/SqlTextEditor/index.ts
);
const componentOutFileName = `${target}.js`; // sql-text-editor.js
const componentOutName = `Bks${componentName}`; // BksSqlTextEditor

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      vue: "vue/dist/vue.min.js",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: componentPath,
      name: componentOutName,
      formats: ["iife"],
      fileName: () => componentOutFileName,
    },
    rollupOptions: {
      external: [/\.css$/, /\.scss$/],
    },
    sourcemap: true,
  },
});
