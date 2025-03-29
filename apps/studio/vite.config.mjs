import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import path from 'path'
import commonjs from 'vite-plugin-commonjs'

// To move to Electron 19+ we need to stop using node libraries
// in the renderer.
// This includes: node side libs, and stuff we've imported ourselves


// Imported libs to stop using
// There are mote too (eg pg), these are just the native ones

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), commonjs()],
  base: '/', // Set the base URL for the app
  optimizeDeps: {
    include: [
      'codemirror',
      'lodash',
      'sql-formatter',
      'sql-query-identifier',
      'tabulator-tables'
    ],
    exclude: [],
    dedupe: ['vue']
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@commercial": path.resolve(__dirname, "./src-commercial"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "assets": path.resolve(__dirname, './src/assets'),
      "@bksLogger": path.resolve(__dirname, './src/lib/log/rendererLogger'),
      "@beekeeperstudio/ui-kit/vue/sql-text-editor": path.resolve(__dirname, "../ui-kit/lib/components/sql-text-editor/SqlTextEditor.vue"),
      "@beekeeperstudio/ui-kit/vue/table": path.resolve(__dirname, "../ui-kit/lib/components/table/Table.vue"),
      "@beekeeperstudio/ui-kit/vue/entity-list": path.resolve(__dirname, "../ui-kit/lib/components/entity-list/EntityList.vue"),
    },
  },
  build: {
    outDir: 'dist/renderer', // Output directory for the renderer process
    emptyOutDir: true, // Clears the directory before building
    rollupOptions: {
      external: [],
      input: './index.html', // Entry point for the renderer process
      output: {
        format: 'cjs'
      },
    }
  },
  server: {
    port: 3003, // Development server port
    // open: './src/index.html'
  }
});
