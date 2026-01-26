import { spawn } from "child_process";
import rawLog from '@bksLogger'

export interface IAwsHandlers {
  "aws/getProfiles": () => Promise<string[]>;
}

export const AwsHandlers: IAwsHandlers = {
  "aws/getProfiles": async function () {
    return new Promise((resolve, reject) => {
      const proc = spawn("aws", ["configure", "list-profiles"], {
        shell: true,
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
          rawLog.error(`AWS CLI failed with code ${code}`);
          reject(
            `aws failed (code ${code})\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`
          );
        }
      });
    });
  },
};
