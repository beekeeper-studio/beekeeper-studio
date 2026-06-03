import { spawn } from "child_process";
import path from "path";
import platformInfo from "@/common/platform_info";

// Directories to search for CLI tools in addition to the inherited PATH.
// macOS GUI apps don't inherit the shell's PATH, so Homebrew's bin dirs are
// missing — add them explicitly so brew-installed tools (pg_dump, mysqldump,
// az, aws, ...) are discovered. Apple Silicon installs to /opt/homebrew/bin,
// Intel to /usr/local/bin. `which` returns the stable symlink there, which
// keeps pointing at the current version after a `brew upgrade`.
export const extraToolSearchDirs: string[] = platformInfo.isMac
  ? ['/opt/homebrew/bin', '/usr/local/bin']
  : [];

export interface ICliHandlers {
  'cli/which': ({ toolName }: { toolName: string }) => Promise<string>,
}

export const CliHandlers: ICliHandlers = {
  'cli/which': async function({ toolName }: { toolName: string }) {
    const command = platformInfo.isWindows ? 'where' : 'which';

    // Pass the environment explicitly so we can prepend Homebrew bin dirs.
    const env = { ...process.env };
    env.PATH = [...extraToolSearchDirs, env.PATH].filter(Boolean).join(path.delimiter);

    return new Promise((resolve, reject) => {
      const proc = spawn(command, [toolName], { shell: false, env });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('error', (err) => {
        reject(err);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          const result = stdout.trim().split('\n')[0]; // pick first match
          resolve(result);
        } else {
          reject(`cli/which failed (code ${code})\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`);
        }
      });
    });
  },
}
