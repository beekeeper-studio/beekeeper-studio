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

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const config = SSHConfig.parse(raw);
    // Pass the connection username so `Match user`/`Match localuser` rules are
    // evaluated against it. Without it, compute() falls back to the OS user and
    // those Match blocks never fire.
    //
    // matchExec (default true, matching ssh(1)) controls whether `Match exec`
    // runs its command. Operators can turn it off via [security]
    // allowSshConfigMatchExec; Host and non-exec Match rules still apply.
    const result = config.compute(
      user ? { Host: host, User: user } : host,
      { ignoreCase: true, matchExec: bksConfig.security.allowSshConfigMatchExec }
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
    endResult.warnings = [
      {
        code: "invalid",
        message: `${tildify(configPath)} could not be parsed and was ignored.`,
      },
    ];
  }

  return endResult;
}
