import { spawn } from "child_process";
import path from "path";
import platformInfo from "@/common/platform_info";

// Directories to search for CLI tools in addition to the inherited PATH.
// GUI apps frequently don't inherit a normal shell PATH — on macOS launchd
// gives a minimal one, and on Linux some packagings (AppImage, Snap) strip it
// further. Explicitly prepend the common executable directories so brew /
// system-installed tools (az, aws, pg_dump, mysqldump, ...) are found, and so
// `which` returns the stable symlink (not the version-pinned Cellar target).
// Duplicates with whatever is already in process.env.PATH are harmless.
export const extraToolSearchDirs: string[] = (() => {
  if (platformInfo.isWindows) return [];
  const system = ['/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];
  return platformInfo.isMac ? ['/opt/homebrew/bin', ...system] : system;
})();

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
