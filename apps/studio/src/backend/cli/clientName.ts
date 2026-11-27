import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

export interface ProcessInfo {
  pid: number;
  ppid: number;
  /** Executable name, without directory or .exe. */
  name: string;
  /** Full command line, when the platform exposes it. */
  args: string;
}

const MAX_DEPTH = 12;

const SHELLS = new Set([
  "sh", "bash", "zsh", "fish", "dash", "ksh", "mksh", "tcsh", "csh", "nu",
  "elvish", "xonsh", "pwsh", "powershell", "cmd",
]);

// Processes that only start other processes; the caller is further up.
const LAUNCHERS = new Set([
  "env", "sudo", "doas", "timeout", "nice", "nohup", "time", "xargs", "script",
  "npx", "npm", "pnpm", "yarn", "bun", "deno", "cross-env", "electron",
  "beekeeper-studio", "beekeeper studio",
]);

// Reaching one of these means there is nothing more specific above.
const ROOTS = new Set(["systemd", "init", "launchd", "explorer", "services", "wininit", "login", "sshd"]);

const KNOWN: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  gemini: "Gemini CLI",
  cursor: "Cursor",
  "cursor-agent": "Cursor",
  code: "VS Code",
  "code - insiders": "VS Code Insiders",
  windsurf: "Windsurf",
  zed: "Zed",
  "zed-editor": "Zed",
  aider: "Aider",
  goose: "Goose",
  opencode: "opencode",
  "gnome-terminal-server": "GNOME Terminal",
  "kgx": "GNOME Console",
  konsole: "Konsole",
  kitty: "kitty",
  alacritty: "Alacritty",
  "wezterm-gui": "WezTerm",
  ghostty: "Ghostty",
  iterm2: "iTerm2",
  terminal: "Terminal",
  windowsterminal: "Windows Terminal",
  openconsole: "Windows Terminal",
  conhost: "Windows Console",
  xterm: "xterm",
  tilix: "Tilix",
  terminator: "Terminator",
  foot: "foot",
  hyper: "Hyper",
  warp: "Warp",
  stable: "Warp",
  tmux: "tmux",
  screen: "screen",
};

// Node based tools show up as `node`; their script path gives them away.
const NODE_SCRIPTS: [RegExp, string][] = [
  [/@anthropic-ai[\\/]claude-code|[\\/]claude(\.js)?(\s|$)/i, "Claude Code"],
  [/@openai[\\/]codex|[\\/]codex(\.js)?(\s|$)/i, "Codex"],
  [/@google[\\/]gemini-cli|[\\/]gemini(\.js)?(\s|$)/i, "Gemini CLI"],
];

const NODE_NAMES = new Set(["node", "nodejs", "mainthread"]);

function normalize(name: string): string {
  // tmux names its server process "tmux: server".
  return path.basename(name.trim()).replace(/\.exe$/i, "").replace(/:.*$/, "").toLowerCase();
}

function isNode(process: ProcessInfo, name: string): boolean {
  return NODE_NAMES.has(name) || NODE_NAMES.has(normalize(process.args.split(" ")[0] || ""));
}

/**
 * The first ancestor that names who ran bks: a coding agent, an editor or a
 * terminal. Shells and launchers are skipped; if nothing else turns up, the
 * shell is the answer.
 */
export function nameFromAncestry(ancestors: ProcessInfo[]): string | null {
  let shell: string | null = null;
  for (const process of ancestors) {
    const name = normalize(process.name);
    if (!name || ROOTS.has(name)) {
      break;
    }
    if (SHELLS.has(name)) {
      shell = shell ?? name;
      continue;
    }
    if (isNode(process, name)) {
      const script = NODE_SCRIPTS.find(([pattern]) => pattern.test(process.args));
      if (script) {
        return script[1];
      }
      continue;
    }
    if (LAUNCHERS.has(name)) {
      continue;
    }
    return KNOWN[name] ?? path.basename(process.name.trim()).replace(/\.exe$/i, "").replace(/:.*$/, "");
  }
  return shell;
}

function linuxProcess(pid: number): ProcessInfo | null {
  try {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
    // The name sits in parentheses and may itself contain spaces or parentheses.
    const close = stat.lastIndexOf(")");
    const name = stat.slice(stat.indexOf("(") + 1, close);
    const ppid = Number(stat.slice(close + 2).split(" ")[1]);
    let args = "";
    try {
      args = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0").join(" ");
    } catch {
      // not readable for every process
    }
    // Some programs retitle themselves ("npm exec tsx /path"); the executable is the first word then.
    const executable = /[\s/]/.test(name) && args ? args.split(" ")[0] : name;
    return { pid, ppid, name: executable, args };
  } catch {
    return null;
  }
}

function macProcess(pid: number): ProcessInfo | null {
  try {
    const out = execFileSync("ps", ["-o", "ppid=", "-o", "comm=", "-p", String(pid)], {
      encoding: "utf8",
      timeout: 1000,
    }).trim();
    const match = out.match(/^(\d+)\s+(.*)$/);
    if (!match) {
      return null;
    }
    let args = "";
    try {
      args = execFileSync("ps", ["-o", "args=", "-p", String(pid)], { encoding: "utf8", timeout: 1000 }).trim();
    } catch {
      // the name alone will do
    }
    return { pid, ppid: Number(match[1]), name: match[2], args };
  } catch {
    return null;
  }
}

function windowsProcesses(): Map<number, ProcessInfo> {
  const processes = new Map<number, ProcessInfo>();
  try {
    const out = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Get-CimInstance Win32_Process | ForEach-Object { \"$($_.ProcessId)`t$($_.ParentProcessId)`t$($_.Name)`t$($_.CommandLine)\" }",
      ],
      { encoding: "utf8", timeout: 5000, windowsHide: true },
    );
    for (const line of out.split(/\r?\n/)) {
      const [pid, ppid, name, args = ""] = line.split("\t");
      if (pid) {
        processes.set(Number(pid), { pid: Number(pid), ppid: Number(ppid), name, args });
      }
    }
  } catch {
    // no ancestry, no name
  }
  return processes;
}

function ancestry(startPid: number): ProcessInfo[] {
  const ancestors: ProcessInfo[] = [];
  let lookup: (pid: number) => ProcessInfo | null;
  if (process.platform === "win32") {
    const all = windowsProcesses();
    lookup = (pid) => all.get(pid) ?? null;
  } else if (process.platform === "linux") {
    lookup = linuxProcess;
  } else {
    lookup = macProcess;
  }
  let pid = startPid;
  for (let depth = 0; depth < MAX_DEPTH && pid > 1; depth++) {
    const info = lookup(pid);
    if (!info) {
      break;
    }
    ancestors.push(info);
    pid = info.ppid;
  }
  return ancestors;
}

/** Who is running bks, as shown in the app's approval dialog. */
export function detectClientName(): string {
  const override = process.env.BKS_CLI_CLIENT?.trim();
  if (override) {
    return override;
  }
  return nameFromAncestry(ancestry(process.ppid)) ?? "Unknown client";
}
