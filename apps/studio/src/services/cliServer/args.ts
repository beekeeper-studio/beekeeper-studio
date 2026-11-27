/**
 * Whether this launch is `beekeeper-studio cli ...`. Launcher flags (such as
 * --no-sandbox) come first, so `cli` is the first positional argument.
 * `electron <app path>` (dev, e2e) puts the app path at argv[1]; a packaged
 * build does not.
 */
export function isCliLaunch(
  argv: string[] = process.argv,
  defaultApp: boolean = !!(process as any).defaultApp,
): boolean {
  const appArgs = argv.slice(defaultApp ? 2 : 1);
  const firstPositional = appArgs.find((arg) => !arg.startsWith("-"));
  return firstPositional === "cli";
}
