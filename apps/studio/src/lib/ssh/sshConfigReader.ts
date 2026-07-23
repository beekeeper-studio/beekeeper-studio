import fs from "fs";
import path from "path";
import os from "os";
import SSHConfig from "ssh-config";
import rawLog from "@bksLogger";
import { resolveHomePathToAbsolute } from "@/handlers/utils";
import bksConfig from "@/common/bksConfig";

const log = rawLog.scope("ssh:config-reader");

export type SshConfigWarningCode = "invalid" | "untrusted" | "missing_identity_file";

export interface SshConfigWarning {
  code: SshConfigWarningCode;
  message: string;
}

export interface SshConfigResult {
  host: string;
  port?: number;
  identityFile?: string;
  identityFiles?: string[];
  identitiesOnly?: boolean;
  user?: string;
  warnings?: SshConfigWarning[];
}

// Display ~/.ssh/config instead of the absolute path when it's under home.
function tildify(p: string): string {
  const home = os.homedir();
  return home && p.startsWith(home) ? `~${p.slice(home.length)}` : p;
}

// Returns a human-readable reason the config can't be trusted, or null if it's
// fine. Mirrors OpenSSH: the config must be owned by the current user (or root)
// and not writable by group or others. `Match exec` runs arbitrary commands via
// compute(), so an untrusted config must be ignored entirely. POSIX-only — NTFS
// ACLs don't map to uid/mode bits, so on Windows (no process.getuid) the file
// is trusted, matching ssh's own platform behaviour.
function configTrustIssue(configPath: string): string | null {
  const getuid = typeof process.getuid === "function" ? process.getuid : null;
  if (!getuid) return null;
  let stats: fs.Stats;
  try {
    stats = fs.statSync(configPath);
  } catch (err) {
    return `it could not be read (${err.message})`;
  }
  if (stats.uid !== 0 && stats.uid !== getuid()) {
    return "it is not owned by the current user";
  }
  if (stats.mode & 0o022) {
    return "it is writable by group or other users";
  }
  return null;
}

// Matches OpenSSH's READCONF_MAX_DEPTH.
const MAX_INCLUDE_DEPTH = 16;

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// glob(3) semantics for a single path segment: * and ? never match a
// separator, ? matches exactly one character.
function fileGlobToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]");
  return new RegExp(`^${escaped}$`);
}

// Resolves an absolute Include pattern to files. Globs are supported in the
// filename portion only; missing files match nothing, like OpenSSH.
function resolveIncludePattern(pattern: string): string[] {
  const dir = path.dirname(pattern);
  const base = path.basename(pattern);
  if (!/[*?]/.test(base)) {
    return isFile(pattern) ? [pattern] : [];
  }
  if (/[*?]/.test(dir)) {
    log.warn(`Glob characters in directory components are not supported: ${pattern}`);
    return [];
  }
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const baseRegExp = fileGlobToRegExp(base);
  return entries
    .filter((name) => baseRegExp.test(name))
    .sort()
    .map((name) => path.join(dir, name))
    .filter(isFile);
}

// Splices each included file's contents in place of its Include line, the way
// ssh(1) reads them.
function expandIncludes(
  raw: string,
  warnings: SshConfigWarning[],
  visited: Set<string>,
  depth: number
): string {
  return raw
    .split(/\r?\n/)
    .map((line) => {
      const include = line.match(/^\s*Include\s+(.+)$/i);
      if (!include) return line;
      if (depth >= MAX_INCLUDE_DEPTH) {
        log.warn(`Include depth limit (${MAX_INCLUDE_DEPTH}) reached, skipping: ${line.trim()}`);
        return "";
      }
      const patterns = include[1].match(/"[^"]*"|\S+/g) ?? [];
      const chunks: string[] = [];
      for (const rawPattern of patterns) {
        let pattern = resolveHomePathToAbsolute(rawPattern.replace(/^"|"$/g, ""));
        if (!path.isAbsolute(pattern)) {
          pattern = path.join(os.homedir(), ".ssh", pattern);
        }
        for (const file of resolveIncludePattern(pattern).map((f) => path.resolve(f))) {
          // Skip visted file if referenced again
          if (visited.has(file)) continue;

          const trustIssue = configTrustIssue(file);
          if (trustIssue) {
            log.warn(`Ignoring included ${file}: ${trustIssue}`);
            warnings.push({
              code: "untrusted",
              message: `${tildify(file)} was ignored because ${trustIssue}.`,
            });
            continue;
          }

          let content: string;
          try {
            content = fs.readFileSync(file, "utf-8");
          } catch (err) {
            log.warn(`Skipping include ${file}: ${err}`);
            continue;
          }

          visited.add(file);
          chunks.push(expandIncludes(content, warnings, visited, depth + 1));
          visited.delete(file);
        }
      }
      return chunks.join("\n");
    })
    .join("\n");
}

export function readSshConfig(
  host: string,
  configPath?: string,
  user?: string
): SshConfigResult {
  const endResult: SshConfigResult = { host };
  configPath = configPath ?? path.join(os.homedir(), ".ssh", "config");
  if (!fs.existsSync(configPath)) {
    return endResult;
  }

  const trustIssue = configTrustIssue(configPath);
  if (trustIssue) {
    log.warn(`Ignoring ${configPath}: ${trustIssue}`);
    endResult.warnings = [
      {
        code: "untrusted",
        message: `${tildify(configPath)} was ignored because ${trustIssue}.`,
      },
    ];
    return endResult;
  }

  const warnings: SshConfigWarning[] = [];
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const expanded = expandIncludes(
      raw,
      warnings,
      new Set([path.resolve(configPath)]),
      0
    );
    const config = SSHConfig.parse(expanded);
    // Pass the connection username so `Match user`/`Match localuser` rules are
    // evaluated against it. Without it, compute() falls back to the OS user and
    // those Match blocks never fire.
    //
    // `Match exec` runs its command by default, matching ssh(1). Operators can
    // turn it off via [security] disableSshConfigMatchExec; Host and non-exec
    // Match rules still apply.
    const result = config.compute(
      user ? { Host: host, User: user } : host,
      { ignoreCase: true, matchExec: !bksConfig.security.disableSshConfigMatchExec }
    );

    if (result.hostname) {
      endResult.host = result.hostname as string;
    }
    if (result.port) {
      endResult.port = Number(result.port);
    }
    if (Array.isArray(result.identityfile) && result.identityfile.length) {
      const resolved = result.identityfile.map((p: string) =>
        resolveHomePathToAbsolute(p)
      );
      endResult.identityFiles = resolved;
      endResult.identityFile = resolved[0];
    }
    if (typeof result.identitiesonly === "string") {
      endResult.identitiesOnly =
        result.identitiesonly.toLowerCase() === "yes";
    }
    if (result.user) {
      endResult.user = result.user as string;
    }
  } catch (err) {
    log.error("Failed to read or parse ~/.ssh/config:", err);
    warnings.push({
      code: "invalid",
      message: `${tildify(configPath)} could not be parsed and was ignored.`,
    });
  }

  if (warnings.length) {
    endResult.warnings = warnings;
  }
  return endResult;
}
