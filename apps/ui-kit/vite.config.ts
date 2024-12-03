import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2';
import { resolve } from 'path'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  build: {
    lib: {
      entry: {
        main: resolve(__dirname, 'lib/main.ts'),
        components: resolve(__dirname, 'lib/components/index.ts'),
        'components/context-menu': resolve(__dirname, 'lib/components/context-menu/index.ts'),
        'components/text-editor': resolve(__dirname, 'lib/components/text-editor/index.ts'),
        'components/sql-text-editor': resolve(__dirname, 'lib/components/sql-text-editor/index.ts'),
        utils: resolve(__dirname, 'lib/utils/index.ts'),
      },
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        entryFileNames: '[name].js',
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue',
        },
      },
    },
    sourcemap: true,
  }

})
