import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";
import { resolve } from "path";

function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function camelCase(val: string) {
  return val.split("-").map(capitalizeFirstLetter).join("");
}

/** Pass `COMPONENT` env to build a specific component. Expects kebab-case. */
const component = process.env.COMPONENT || "main";

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
      ...(component === "main"
        ? {
          entry: resolve(__dirname, "lib/components/index.ts"),
          name: "BksComponents",
          fileName: () => "main.js",
        }
        : {
          entry: resolve(
            __dirname,
            `lib/components/${component}/index.ts`
          ),
          name: `Bks${camelCase(component)}`,
          fileName: () => `${component}.js`,
        }),
      formats: ["iife"],
    },
    // rollupOptions: {
    //   external: [/\.css$/, /\.scss$/],
    // },
    sourcemap: true,
  },
});
