import fs from "fs";
import path from "path";
import os from "os";
import SSHConfig from "ssh-config";
import rawLog from "@bksLogger";
import { resolveHomePathToAbsolute } from "@/handlers/utils";
import _ from "lodash";

const log = rawLog.scope("ssh:config-reader");

export interface SshConfigResult {
  host: string;
  port?: number;
  identityFile?: string;
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
    if (result.identityfile?.[0]) {
      endResult.identityFile = resolveHomePathToAbsolute(
        result.identityfile[0]
      );
    }
    if (result.user) {
      endResult.user = result.user as string;
    }
  } catch (err) {
    log.error("Failed to read or parse ~/.ssh/config:", err);
  }

  return endResult;
}
