import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import path from 'path'

// To move to Electron 19+ we need to stop using node libraries
// in the renderer.
// This includes: node side libs, and stuff we've imported ourselves

// Node libs to stop using
const nodeExternals = [
'fs', 'path', 'os', 'stream',
'child_process', 'crypto', 'http', 'tls', 'https', 'net',
'dns', 'zlib', 'timers'
]

// Imported libs to stop using
// There are mote too (eg pg), these are just the native ones
const npmExternals = [
        'better-sqlite3',
        'sequelize', 'typeorm', 'reflect-metadata',
        'cassandra-driver', 'mysql2', 'ssh2', 'bks-oracledb',
        'oracledb', '@electron/remote', "@google-cloud/bigquery"
]

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // Set the base URL for the app
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../../shared/src"),
    },
  },
  build: {
    outDir: 'dist/renderer', // Output directory for the renderer process
    emptyOutDir: true, // Clears the directory before building
    rollupOptions: {
      external: ['electron', ...nodeExternals, ...npmExternals],
      input: './src/index.html', // Entry point for the renderer process
      output: {
        format: 'cjs'
      },
    }
  },
  server: {
    port: 3000, // Development server port
    // open: './src/index.html'
  }
});
