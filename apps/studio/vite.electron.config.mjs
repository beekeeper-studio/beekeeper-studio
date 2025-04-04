import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import path from 'path'
import commonjs from 'vite-plugin-commonjs'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  plugins: [
    vue(), 
    commonjs(),
    electron({
      main: {
        entry: 'src-commercial/entrypoints/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'src-commercial/entrypoints/preload.ts'),
      },
      renderer: {},
    })
  ],
  base: '/', // Set the base URL for the app
  optimizeDeps: {
    exclude: []
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@commercial": path.resolve(__dirname, "./src-commercial"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "assets": path.resolve(__dirname, './src/assets'),
      "@bksLogger": path.resolve(__dirname, './src/lib/log/rendererLogger'),
      buffer: 'buffer/' // avoid uncaught error on dynamic require
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
