import { spawn } from "child_process";
import rawLog from '@bksLogger'

export interface IAwsHandlers {
  "aws/getProfiles": (args: { toolName?: string }) => Promise<string[]>;
}

export const AwsHandlers: IAwsHandlers = {
  "aws/getProfiles": async function ({ toolName }: { toolName?: string } = {}) {
    // Use the binary the user selected/discovered (an absolute path), not
    // whatever bare `aws` happens to be first on PATH — that could be a
    // different, older CLI. shell:false to match the rest of the spawn
    // surface (see cliAuth.exploit.spec.ts).
    const awsBin = toolName || "aws";
    return new Promise((resolve, reject) => {
      const proc = spawn(awsBin, ["configure", "list-profiles"], {
        shell: false,
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
