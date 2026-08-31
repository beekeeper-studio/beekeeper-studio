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

type ReadConfigResult = {
  content: string;
  warning?: SshConfigWarning;
};

function readConfigFile(configPath: string): ReadConfigResult {
  const trustIssue = configTrustIssue(configPath);

  if (trustIssue) {
    log.warn(`Ignoring ${configPath}: ${trustIssue}`);
    return {
      content: "",
      warning: {
        code: "untrusted",
        message: `${tildify(configPath)} was ignored because ${trustIssue}.`,
      },
    };
  }

  try {
    return {
      content: fs.readFileSync(configPath, "utf8"),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    log.warn(`Ignoring ${configPath}: ${message}`);
    return {
      content: "",
      warning: {
        code: "invalid",
        message: `${tildify(configPath)} could not be read and was ignored.`,
      },
    };
  }
}

// ssh(1) resolves a relative Include against the directory of the config that
// declared it, not the working directory.
function resolveIncludePattern(pattern: string, includeRoot: string): string {
  const expanded = resolveHomePathToAbsolute(pattern);
  return path.isAbsolute(expanded) ? expanded : path.join(includeRoot, expanded);
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
  rootConfigPath?: string,
  user?: string
): SshConfigResult {
  const endResult: SshConfigResult = { host };
  const warnings: SshConfigWarning[] = [];

  rootConfigPath = rootConfigPath ?? path.join(os.homedir(), ".ssh", "config");
  if (!fs.existsSync(rootConfigPath)) {
    return endResult;
  }

  const rootConfig = readConfigFile(rootConfigPath);
  if (rootConfig.warning) {
    endResult.warnings = [rootConfig.warning];
    return endResult;
  }

  const includeRoot = path.dirname(rootConfigPath);

  // Expanded in place so ordering holds. Nested Includes are not expanded.
  const includeRegex = /^Include[ \t]+(.+)$/gim;
  const expandedConfig = rootConfig.content.replace(includeRegex, (_, rawPattern) => {
    // The leading whitespace keeps a `#` inside a filename intact.
    const pattern = rawPattern.replace(/\s+#.*$/, "").trim();
    let combinedConfig = "";

    // A bad include must not take down the rest of the config.
    let matchedEntries: fs.Dirent[];
    try {
      matchedEntries = fs
        .globSync(resolveIncludePattern(pattern, includeRoot), {
          withFileTypes: true,
        })
        .filter((entry) => !entry.isDirectory());
    } catch (err) {
      log.warn(`Ignoring Include ${pattern}: ${err.message}`);
      warnings.push({
        code: "invalid",
        message: `Include ${pattern} could not be expanded and was ignored.`,
      });
      return "";
    }

    for (const entry of matchedEntries) {
      const filePath = path.join(entry.parentPath, entry.name);
      const includedFile = readConfigFile(filePath);

      if (includedFile.warning) {
        warnings.push(includedFile.warning);
      }

      combinedConfig += includedFile.content + "\n";
    }

    return combinedConfig;
  });

  try {
    const config = SSHConfig.parse(expandedConfig);
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
    log.error("Failed to parse ~/.ssh/config:", err);
    warnings.push({
      code: "invalid",
      message: `${tildify(rootConfigPath)} could not be parsed and was ignored.`,
    });
  }

  if (warnings.length) {
    endResult.warnings = warnings;
  }

  return endResult;
}
