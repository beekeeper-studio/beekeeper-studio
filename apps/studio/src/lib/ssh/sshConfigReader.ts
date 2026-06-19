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

export function readSshConfig(host: string, configPath?: string): SshConfigResult {
  const endResult: SshConfigResult = { host };
  configPath = configPath ?? path.join(os.homedir(), ".ssh", "config");
  if (!fs.existsSync(configPath)) {
    return endResult;
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const config = SSHConfig.parse(raw);
    const result = config.compute(host, { ignoreCase: true });

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
