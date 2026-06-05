import fs from "fs";
import path from "path";
import os from "os";
import SSHConfig from "ssh-config";
import rawLog from "@bksLogger";
import { resolveHomePathToAbsolute } from "@/handlers/utils";

const log = rawLog.scope("ssh:config-reader");

export interface SshConfigResult {
  host: string;
  port?: number;
  identityFile?: string;
  identityFiles?: string[];
  identitiesOnly?: boolean;
  user?: string;
}

// Mirror OpenSSH: only honour a config that is owned by the current user (or
// root) and not writable by group or others. `Match exec` runs arbitrary
// commands via compute(), so an untrusted config must be ignored entirely.
// POSIX-only — NTFS ACLs don't map to uid/mode bits, so on Windows (no
// process.getuid) the file is trusted, matching ssh's own platform behaviour.
function isConfigTrusted(configPath: string): boolean {
  const getuid = typeof process.getuid === "function" ? process.getuid : null;
  if (!getuid) return true;
  let stats: fs.Stats;
  try {
    stats = fs.statSync(configPath);
  } catch (err) {
    log.warn(`Cannot stat ${configPath}, ignoring it: ${err.message}`);
    return false;
  }
  if (stats.uid !== 0 && stats.uid !== getuid()) {
    log.warn(`Ignoring ${configPath}: not owned by the current user`);
    return false;
  }
  if (stats.mode & 0o022) {
    log.warn(`Ignoring ${configPath}: group/world-writable permissions`);
    return false;
  }
  return true;
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
  if (!isConfigTrusted(configPath)) {
    return endResult;
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const config = SSHConfig.parse(raw);
    // Pass the connection username so `Match user`/`Match localuser` rules are
    // evaluated against it. Without it, compute() falls back to the OS user and
    // those Match blocks never fire.
    const result = config.compute(
      user ? { Host: host, User: user } : host,
      { ignoreCase: true }
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
  }

  return endResult;
}
