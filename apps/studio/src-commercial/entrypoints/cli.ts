/**
 * Entry point of the `bks` command: the Beekeeper Studio CLI.
 *
 * This file is bundled on its own into dist/cli.js and runs under plain Node,
 * either a system `node` or the app's Electron binary started with
 * ELECTRON_RUN_AS_NODE=1 (see build/bks). It may import only
 * src/cli and @beekeeperstudio/cli-client, never electron or the rest of the app; the esbuild
 * target enforces it.
 */
import { createProgram } from "@/cli/program";
import { version } from "../../package.json";

const program = createProgram({ version });

program
  .parseAsync(process.argv, { from: "node" })
  .catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`);
    // exitCode rather than exit(): lets stdout drain when it is a pipe.
    process.exitCode = 1;
  });
