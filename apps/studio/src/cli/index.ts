/**
 * Entry point of the `bks` command: the Beekeeper Studio CLI.
 *
 * This file is bundled on its own into dist/cli.js and runs under plain Node,
 * either a system `node` or the app's Electron binary started with
 * ELECTRON_RUN_AS_NODE=1 (see build/bks). Nothing under src/cli may import
 * electron or the rest of the app; eslint and the esbuild target enforce it.
 */
import fs from 'fs'
import path from 'path'
import { runCli } from './client'
import { defaultCliSocketPath } from './socketPath'

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk: string) => {
      text += chunk
    })
    process.stdin.on('end', () => resolve(text))
    process.stdin.on('error', reject)
  })
}

export function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  return runCli(argv, {
    socketPath: defaultCliSocketPath(),
    io: {
      writeOut: (text) => {
        process.stdout.write(text)
      },
      writeErr: (text) => {
        process.stderr.write(text)
      },
      readFile: (file) => fs.promises.readFile(path.resolve(file), 'utf8'),
      readStdin,
    },
  })
}

main().then(
  (code) => {
    // exitCode rather than exit(): lets stdout drain when it is a pipe.
    process.exitCode = code
  },
  (error) => {
    process.stderr.write(`${error?.stack || error}\n`)
    process.exitCode = 1
  }
)
