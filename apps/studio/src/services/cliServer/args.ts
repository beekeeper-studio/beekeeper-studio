/**
 * The binary receives launcher flags ahead of the user's own arguments (the
 * linux launcher script adds --no-sandbox, bks-flags.conf may add more), so
 * `cli` is the first positional argument rather than argv[0]. Returns the
 * arguments after `cli`, or null for a normal app launch.
 */
export function extractCliArgs(appArgs: string[]): string[] | null {
  for (let i = 0; i < appArgs.length; i++) {
    const arg = appArgs[i];
    if (arg === "cli") return appArgs.slice(i + 1);
    if (!arg.startsWith("-")) return null;
  }
  return null;
}

/**
 * `extractCliArgs` applied to this process's own argv. `electron <app path>`
 * (dev, e2e) puts the app path at argv[1]; a packaged build does not.
 */
export function cliArgsFromProcessArgv(
  argv: string[] = (typeof process !== "undefined" && process.argv) || [],
  defaultApp: boolean = typeof process !== "undefined" &&
    !!(process as any).defaultApp,
): string[] | null {
  return extractCliArgs(argv.slice(defaultApp ? 2 : 1));
}
