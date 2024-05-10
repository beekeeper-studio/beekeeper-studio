// vite.config.js
import vue from '@vitejs/plugin-vue2'
import path from 'path'

export default {
  root: path.join(__dirname, 'src'),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../../shared/src"),
    },
  },
  build: {
    sourcemap: true,
    outDir: path.join(__dirname, 'nubuild'),
    assetsDir: './',
    brotliSize: false,
    emptyOutDir: false,

    rollupOptions: {
      input: {
        mainWindow: path.join(__dirname, 'src/index.html'),
      },
    },
  },
  plugins: [vue()]
}
