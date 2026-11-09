import { defineConfig } from 'vite';
import vue from 'vite-ng-plugin-vue2';
import path from 'path'
import commonjs from 'vite-plugin-commonjs'

// To move to Electron 19+ we need to stop using node libraries
// in the renderer.
// This includes: node side libs, and stuff we've imported ourselves


// Imported libs to stop using
// There are mote too (eg pg), these are just the native ones

// Theme CSS lives in public/, so it is outside the module graph and Vite
// won't touch it on change. Tell the client to reload just that stylesheet.
function themeHmr() {
  return {
    name: 'theme-hmr',
    configureServer(server) {
      const themesDir = path.resolve(__dirname, 'public/themes')
      server.watcher.add(themesDir)
      server.watcher.on('change', (file) => {
        if (path.resolve(file).startsWith(themesDir)) {
          server.ws.send({ type: 'custom', event: 'theme-css-update' })
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), commonjs(), themeHmr()],
  base: '/', // Set the base URL for the app
  optimizeDeps: {
    exclude: [
      // Exclude native modules from optimization
      // Without this, the build fails :(
      'cpu-features',
      'ssh2',
      'kerberos',
      'better-sqlite3',
      'oracledb'
    ]
},
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@commercial": path.resolve(__dirname, "./src-commercial"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "assets": path.resolve(__dirname, './src/assets'),
      "@bksLogger": path.resolve(__dirname, './src/lib/log/rendererLogger')
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
    strictPort: true, // Fail loudly if 3003 is taken (e.g. a stale dev server) instead of silently using another port
    // open: './src/index.html'
  }
});
