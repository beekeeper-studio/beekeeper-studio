import { spawn } from "child_process";
import path from "path";
import rawLog from '@bksLogger'
import { extraToolSearchDirs } from "./cliHandlers";

export interface IAwsHandlers {
  "aws/getProfiles": (args: { toolName?: string }) => Promise<string[]>;
}

export const AwsHandlers: IAwsHandlers = {
  "aws/getProfiles": async function ({ toolName }: { toolName?: string } = {}) {
    // Use the binary the user selected/discovered (an absolute path), not
    // whatever bare `aws` happens to be first on PATH — that could be a
    // different, older CLI. shell:false to match the rest of the spawn
    // surface (see cliAuth.exploit.spec.ts). In practice toolName is always
    // an absolute path (CommonIam's watcher returns early when cliPath is
    // empty), but extend PATH defensively so the bare-`aws` fallback works
    // the same way `cli/which` does on GUI-launched macOS/Linux.
    const awsBin = toolName || "aws";
    const env = { ...process.env };
    env.PATH = [...extraToolSearchDirs, env.PATH].filter(Boolean).join(path.delimiter);
    return new Promise((resolve, reject) => {
      const proc = spawn(awsBin, ["configure", "list-profiles"], {
        shell: false,
        env,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      proc.on("error", (err) => {
        reject(err);
      });

      proc.on("close", (code) => {
        if (code === 0) {
          const profiles = stdout.trim().split("\n");
          resolve(profiles);
        } else {
          // Expected when the CLI is too old for `list-profiles` (v1 < 1.16.146)
          // or no profiles are configured; the form falls back to manual entry.
          rawLog.warn(`aws configure list-profiles failed (code ${code}); falling back to manual profile entry`);
          reject(
            `aws failed (code ${code})\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`
          );
        }
      });
    });
  },
};
