import { defineConfig } from 'vitest/config'
import vue from 'vite-ng-plugin-vue2'
import { resolve } from 'path'

export default defineConfig({
  // Compiles .vue files, so component specs can mount them
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./lib"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
  },
})
