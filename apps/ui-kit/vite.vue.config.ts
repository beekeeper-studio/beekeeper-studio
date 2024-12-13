import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2';
import { resolve } from 'path'
import vueWcStyles from 'vite-plugin-vue-wc-styles';

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.WEB_COMPONENTS': false,
  },
  plugins: [
    vue(),
    vueWcStyles(),
  ],
  build: {
    outDir: 'dist/vue',
    lib: {
      entry: {
        main: resolve(__dirname, 'lib/main.ts'),
        components: resolve(__dirname, 'lib/components/index.ts'),
        'components/ContextMenu': resolve(__dirname, 'lib/components/ContextMenu/index.ts'),
        'components/TextEditor': resolve(__dirname, 'lib/components/TextEditor/index.ts'),
        'components/SqlTextEditor': resolve(__dirname, 'lib/components/SqlTextEditor/index.ts'),
        'components/Table': resolve(__dirname, 'lib/components/Table/index.ts'),
        'components/JsonRowViewer': resolve(__dirname, 'lib/components/JsonRowViewer/index.ts'),
        utils: resolve(__dirname, 'lib/utils/index.ts'),
        'utils/binary': resolve(__dirname, 'lib/utils/binary.ts'),
      },
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        // entryFileNames: '[name].js',
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
