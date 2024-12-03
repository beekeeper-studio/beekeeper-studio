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
        'components/ContextMenu': resolve(__dirname, 'lib/components/ContextMenu/index.ts'),
        'components/TextEditor': resolve(__dirname, 'lib/components/TextEditor/index.ts'),
        'components/SqlTextEditor': resolve(__dirname, 'lib/components/SqlTextEditor/index.ts'),
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
