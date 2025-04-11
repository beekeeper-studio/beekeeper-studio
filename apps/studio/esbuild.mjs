#!/usr/bin/env node
import esbuild from 'esbuild';
import { spawn, exec, fork } from 'child_process'
import path from 'path';
import _ from 'lodash'
import fs from 'fs'

const isWatching = process.argv[2] === 'watch';

function getElectronBinary() {
  const winLinux = path.join('../../node_modules/electron/dist/electron')
  const mac = path.join('../../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
  const result = process.platform === 'darwin' ? mac : winLinux
  return path.resolve(result)
}

let electronBin
try {
  electronBin = getElectronBinary()
  console.log("Path to electron: ", electronBin)
} catch (err) {
  console.error(err)
  throw new Error(err)
}

const externals = ['better-sqlite3', 'sqlite3',
        'sequelize', 'reflect-metadata',
        'cassandra-driver', 'mysql2', 'ssh2', 'mysql',
        'oracledb', '@electron/remote', "@google-cloud/bigquery",
        'pg-query-stream', 'electron', '@duckdb/node-api',
        '@mongosh/browser-runtime-electron', '@mongosh/service-provider-node-driver',
        'mongodb-client-encryption'

      ]

let electron = null
let isRestarting = false
/** @type {fs.FSWatcher[]} */
const configWatchers = {}

// Function to kill the electron process with timeout
function killElectron() {
  return new Promise((resolve, reject) => {
    if (!electron) return resolve();
    
    console.log(`Attempting to kill electron process (PID: ${electron.pid})...`);
    
    // Set a timeout to force kill if graceful shutdown takes too long
    const forceKillTimeout = setTimeout(() => {
      console.log(`Electron didn't exit gracefully, force killing process...`);
      try {
        process.kill(electron.pid, 'SIGKILL');
      } catch (err) {
        console.log(`Error force killing electron: ${err.message}`);
      }
      electron = null;
      resolve();
    }, 2000);
    
    // Listen for process exit
    const exitHandler = () => {
      clearTimeout(forceKillTimeout);
      electron = null;
      resolve();
    };
    
    // Try graceful shutdown first
    try {
      electron.once('exit', exitHandler);
      process.kill(electron.pid, 'SIGINT');
    } catch (err) {
      console.log(`Error killing electron: ${err.message}`);
      clearTimeout(forceKillTimeout);
      electron = null;
      resolve();
    }
  });
}

// Function to start a new electron process
function startElectron() {
  electron = spawn(electronBin, ['.'], { stdio: 'inherit' });
  console.log(`Spawned electron, pid: ${electron.pid}`);
  
  electron.on('error', (err) => {
    console.error(`Electron spawn error: ${err.message}`);
    electron = null;
  });
  
  electron.on('exit', (code, signal) => {
    console.log(`Electron exited with code ${code} and signal ${signal}`);
    
    // If electron exits but not due to our restart
    if (!isRestarting) {
      if (!signal) {
        // Normal exit - propagate it
        process.exit(code);
      } else {
        // Abnormal exit
        console.log(`Electron was terminated by signal ${signal}`);
        electron = null;
      }
    }
  });
}

const restartElectron = _.debounce(async () => {
  // Prevent multiple overlapping restarts
  if (isRestarting) {
    console.log('Already restarting, ignoring request');
    return;
  }
  
  try {
    isRestarting = true;
    
    // Kill existing process if running
    if (electron) {
      await killElectron();
    }
    
    // Start a new electron process
    startElectron();
  } catch (err) {
    console.error(`Error during restart: ${err.message}`);
  } finally {
    isRestarting = false;
  }
}, 500)

function watchConfig(file) {
  if (configWatchers[file]) return
  const watcher = fs.watch(file, () => {
    console.log(`Detected change in ${file}, rebuilding...`);
    restartElectron()
  })
  configWatchers[file] = watcher
}

function getElectronPlugin(name, action = () => restartElectron()) {
  return {
    name: `${name}-plugin`,
    setup(build) {
      if (!isWatching) return
      build.onStart(() => console.log(`ESBUILD: Building ${name}  🏗`))
      build.onEnd(result => {
        if (result.errors.length > 0) {
          console.error(`ESBUILD: Build failed for ${name} ❌`);
          result.errors.forEach(error => {
            console.error(` - ${error.text} (${error.location?.file}:${error.location?.line}:${error.location?.column})`);
          });
          // Don't restart electron when there are errors
          return;
        }
        
        console.log(`ESBUILD: Built ${name} ✅`);
        action();
        watchConfig('default.config.ini');
        watchConfig('local.config.ini');
        watchConfig('system.config.ini');
      });
    }
  }
}



const env = isWatching ? '"development"' : '"production"';
const commonArgs = {
  platform: 'node',
  publicPath: '.',
  outdir: 'dist',
  bundle: true,
  external: [...externals, '*.woff', '*.woff2', '*.ttf', '*.svg', '*.png'],
  sourcemap: true,
  minify: false,
  define: {
    'process.env.NODE_ENV': env
  }
}

  const mainArgs = {
    ...commonArgs,
    entryPoints: ['src-commercial/entrypoints/main.ts', 'src-commercial/entrypoints/utility.ts', 'src-commercial/entrypoints/preload.ts'],
    plugins: [getElectronPlugin("Main")]
  }

  try {
    if(isWatching) {
      const main = await esbuild.context(mainArgs)
      await Promise.all([main.watch()])
      
      // Start electron for the first time after initial build
      console.log('Initial build complete, starting Electron...');
      startElectron();
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down...');
        if (electron) {
          await killElectron();
        }
        process.exit(0);
      });
      
    } else {
      const results = await Promise.all([
        esbuild.build(mainArgs),
      ]);
      
      // Check for errors in non-watch mode build
      const errorCount = results.reduce((count, result) => 
        count + (result.errors ? result.errors.length : 0), 0);
      
      if (errorCount > 0) {
        console.error('Build failed with errors. Exiting.');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Build failed with an unexpected error:', error);
    process.exit(1);
  }
// launch electron
