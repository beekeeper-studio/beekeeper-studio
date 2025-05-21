import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  root: "src",
  define: {
    __PROJECT_ROOT__: JSON.stringify(__dirname),
  },
});
