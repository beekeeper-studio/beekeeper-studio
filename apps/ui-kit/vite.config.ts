import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2';
import { resolve } from 'path'
import dts from 'vite-plugin-dts';
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      tsconfigPath: './tsconfig.app.json',
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/main.ts'),
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue'],
    },
    sourcemap: true,
  }

})
