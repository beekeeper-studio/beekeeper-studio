import esbuild from 'esbuild';
import { builtinModules } from 'module';
import path from 'path';
import vuePlugin from 'esbuild-vue'
import pkg from './package.json';

interface Options {
  mode?: 'development' | 'production';
}

export default async function build(options: Options) {
  const mode = options.mode || 'production';
  const __DEV__ = mode !== 'production';
  const PORT = pkg.dev['dev-server-port'];

  // WHY WOULD YOU DO THIS?
  // const outdir = __DEV__
  //   ? path.join(__dirname, 'src')
  //   : path.join(__dirname, 'build');

  const outdir = path.join(__dirname, 'nubuild')

  const env: Record<string, string> = __DEV__
    ? {
      'process.env.APP_RENDER_URL': JSON.stringify(
        `http://localhost:${PORT}/index.html`
      ),
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.BKS_ENV': JSON.stringify('development'),
      'process.env.BUILD_DATE': JSON.stringify(new Date()),
    }
    : {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.BKS_ENV': JSON.stringify('production'),
      'process.env.BUILD_DATE': JSON.stringify(new Date()),
    };
  // const preload = esbuild.build({
  //   entryPoints: ['./src/preload.ts'],
  //   outfile: path.join(outdir, 'preload.js'),
  //   target: 'esnext',
  //   bundle: true,
  //   platform: 'node',
  //   sourcemap: true,
  //   format: 'cjs',
  //   external: ['electron'],
  // });

  // const main = esbuild.build({
  //   entryPoints: ['./src/main.ts'],
  //   outfile: path.join(outdir, 'main.js'),
  //   target: 'esnext',
  //   bundle: true,
  //   platform: 'node',
  //   sourcemap: true,
  //   format: 'cjs',
  //   external: ['electron'],
  //   plugins: [
  //     vuePlugin({
  //       extractCss: true,
  //       onReadFile: () => null,
  //     })
  //   ],
  //   loader: {
  //     '.node': 'copy',
  //     '.woff': 'file',
  //     '.woff2': 'file' // Also configure woff2 if needed
  //   },
  // });
  const renderer = esbuild.build({
    entryPoints: ['./src/background.ts'],
    outfile: path.join(outdir, 'background.min.js'),
    bundle: true,
    platform: 'node',
    sourcemap: true,
    format: 'cjs',
    define: env,
    external: [
      'electron',
      ...Object.keys(pkg.dependencies),
      ...Object.keys(builtinModules),
    ],
  });

  return Promise.all([
    main,
  ]);
}

// Build if ran as a cli script
const isMain = require.main === module;

if (isMain) {
  const mode =
    process.env.NODE_ENV === 'development' ? 'development' : 'production';
  build({ mode });
}
