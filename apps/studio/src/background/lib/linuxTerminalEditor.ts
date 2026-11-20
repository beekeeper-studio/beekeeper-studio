import { execFile, spawn } from "child_process";
import { accessSync, constants, readFileSync } from "fs";
import os from "os";
import path from "path";

/**
 * Opening a file with a terminal editor (vim, nano, helix, ...) set as the
 * default app on Linux.
 *
 * `shell.openPath` uses `xdg-open`. Outside the desktop environments it knows
 * (e.g. on Hyprland or sway), xdg-utils <= 1.2 runs the app's `Exec` line
 * directly and ignores `Terminal=true`, so the editor either takes over the
 * terminal the app was started from, or exits at once when there is none.
 * Here the app is started inside a terminal instead.
 */

export type DesktopEntry = {
  exec?: string;
  terminal: boolean;
};

/** Reads `Exec` and `Terminal` from the `[Desktop Entry]` group. */
export function parseDesktopEntry(text: string): DesktopEntry {
  const entry: DesktopEntry = { terminal: false };
  let inMainGroup = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[")) {
      inMainGroup = line === "[Desktop Entry]";
      continue;
    }
    if (!inMainGroup) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key === "Exec") entry.exec = value;
    if (key === "Terminal") entry.terminal = value.toLowerCase() === "true";
  }
  return entry;
}

/** Splits an `Exec` value into arguments, honouring double quotes. */
function splitExec(exec: string): string[] {
  const args: string[] = [];
  let current = "";
  let quoted = false;
  let hasToken = false;
  for (let i = 0; i < exec.length; i++) {
    const ch = exec[i];
    if (quoted && ch === "\\" && i + 1 < exec.length) {
      current += exec[++i];
    } else if (ch === '"') {
      quoted = !quoted;
      hasToken = true;
    } else if (!quoted && /\s/.test(ch)) {
      if (hasToken) args.push(current);
      current = "";
      hasToken = false;
    } else {
      current += ch;
      hasToken = true;
    }
  }
  if (hasToken) args.push(current);
  return args;
}

/**
 * The editor command for `filePath`: the `Exec` line with the file in place of
 * `%f` / `%F` / `%u` / `%U` (appended if there is none) and the other field
 * codes removed.
 */
export function buildEditorCommand(exec: string, filePath: string): string[] {
  const result: string[] = [];
  let hasFileCode = false;
  for (const arg of splitExec(exec)) {
    if (["%f", "%F", "%u", "%U"].includes(arg)) {
      result.push(filePath);
      hasFileCode = true;
      continue;
    }
    // %i, %c, %k and deprecated codes expand to nothing for our purposes
    const cleaned = arg.replace(/%[a-zA-Z]/g, "").replace(/%%/g, "%");
    if (cleaned) result.push(cleaned);
  }
  if (!hasFileCode) result.push(filePath);
  return result;
}

/** How each known terminal takes a command to run. */
const KNOWN_TERMINALS: [string, string[]][] = [
  ["ghostty", ["-e"]],
  ["kitty", []],
  ["alacritty", ["-e"]],
  ["foot", []],
  ["wezterm", ["start", "--"]],
  ["konsole", ["-e"]],
  ["gnome-terminal", ["--"]],
  ["kgx", ["--"]],
  ["xfce4-terminal", ["-x"]],
  ["tilix", ["-e"]],
  ["x-terminal-emulator", ["-e"]],
  ["xterm", ["-e"]],
];

/**
 * The command that runs `command` in a terminal, or null if none is found.
 * Prefers `xdg-terminal-exec` (the freedesktop default-terminal launcher),
 * then `$TERMINAL`, then the terminals above.
 */
export function terminalCommand(
  command: string[],
  env: NodeJS.ProcessEnv,
  findInPath: (name: string) => boolean
): string[] | null {
  if (findInPath("xdg-terminal-exec")) return ["xdg-terminal-exec", ...command];

  const fromEnv = env.TERMINAL?.trim();
  if (fromEnv) {
    const name = path.basename(fromEnv);
    const known = KNOWN_TERMINALS.find(([t]) => t === name);
    return [fromEnv, ...(known ? known[1] : ["-e"]), ...command];
  }

  for (const [name, args] of KNOWN_TERMINALS) {
    if (findInPath(name)) return [name, ...args, ...command];
  }
  return null;
}

function isExecutable(file: string): boolean {
  try {
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function findInPath(name: string, env: NodeJS.ProcessEnv): boolean {
  return (env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .some((dir) => isExecutable(path.join(dir, name)));
}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 5000 }, (error, stdout) => {
      resolve(error ? "" : stdout.trim());
    });
  });
}

/** Desktop file ids map to paths, e.g. `org-foo.desktop` may be `org/foo.desktop`. */
function findDesktopFile(id: string, env: NodeJS.ProcessEnv): string | null {
  const dataHome = env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  const dataDirs = (env.XDG_DATA_DIRS || "/usr/local/share:/usr/share").split(":");
  const candidates = [id, id.replace(/-/g, "/")];
  for (const dir of [dataHome, ...dataDirs]) {
    for (const candidate of candidates) {
      const file = path.join(dir, "applications", candidate);
      try {
        return readFileSync(file, "utf-8") ? file : null;
      } catch {
        // try the next location
      }
    }
  }
  return null;
}

/**
 * Opens `filePath` in a terminal when the default app for it is a terminal
 * app. Returns false when it isn't (or nothing could be determined), so the
 * caller falls back to `shell.openPath`.
 */
export async function openWithTerminalEditor(
  filePath: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const mimeType = await run("xdg-mime", ["query", "filetype", filePath]);
  // `.ini` is `application/x-wine-extension-ini`, which usually has no app of
  // its own and inherits the one for text/plain
  let desktopId = mimeType ? await run("xdg-mime", ["query", "default", mimeType]) : "";
  if (!desktopId) desktopId = await run("xdg-mime", ["query", "default", "text/plain"]);
  if (!desktopId) return false;

  const desktopFile = findDesktopFile(desktopId, env);
  if (!desktopFile) return false;

  const entry = parseDesktopEntry(readFileSync(desktopFile, "utf-8"));
  if (!entry.terminal || !entry.exec) return false;

  const command = terminalCommand(
    buildEditorCommand(entry.exec, filePath),
    env,
    (name) => findInPath(name, env)
  );
  if (!command) return false;

  return await new Promise<boolean>((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", () => resolve(false));
    child.once("spawn", () => {
      child.unref();
      resolve(true);
    });
  });
}
