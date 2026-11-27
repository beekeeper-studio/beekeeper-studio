import { createHash } from "crypto";
import os from "os";
import path from "path";

export interface CliSocketPathOptions {
  /** Where the app keeps its data (electron's userData). The socket lives next to app.db. */
  userDirectory: string;
  isWindows: boolean;
  /** Dev builds use a different socket so they never answer for an installed app, or vice versa. */
  isDevelopment: boolean;
  /** Override for tests; defaults to os.tmpdir(). */
  tmpDir?: string;
}

// sun_path is 108 bytes on Linux and 104 on macOS. Stay comfortably below.
export const UNIX_SOCKET_PATH_LIMIT = 100;

export function isWindowsPipePath(socketPath: string): boolean {
  return /^\\\\[.?]\\pipe\\/.test(socketPath);
}

export function resolveCliSocketPath(options: CliSocketPathOptions): string {
  const suffix = options.isDevelopment ? "-dev" : "";
  const resolved = path.resolve(options.userDirectory);
  // Windows paths are case-insensitive, and the app (SHGetKnownFolderPath) and
  // the CLI (%APPDATA%) can spell the same directory differently. Both must
  // land on the same pipe name.
  const hash = createHash("sha1")
    .update(options.isWindows ? resolved.toLowerCase() : resolved)
    .digest("hex")
    .slice(0, 12);

  if (options.isWindows) {
    return `\\\\.\\pipe\\beekeeper-studio-cli${suffix}-${hash}`;
  }

  const preferred = path.join(options.userDirectory, `cli${suffix}.sock`);
  if (preferred.length < UNIX_SOCKET_PATH_LIMIT) {
    return preferred;
  }

  return path.join(
    options.tmpDir ?? os.tmpdir(),
    `beekeeper-studio-cli${suffix}-${hash}.sock`,
  );
}

/** The directory name electron derives from package.json `name`: appData/<name>. */
export const APP_DATA_DIR_NAME = "beekeeper-studio";

function defaultUserDirectory(): string {
  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      APP_DATA_DIR_NAME,
    );
  }
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      APP_DATA_DIR_NAME,
    );
  }
  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
    APP_DATA_DIR_NAME,
  );
}

/** The socket the CLI connects to. Return value can be overriden by `BKS_CLI_SOCKET`. */
export function defaultCliSocketPath(): string {
  const override = process.env.BKS_CLI_SOCKET?.trim();
  if (override) {
    return override;
  }
  const dev = process.env.BKS_CLI_DEV;
  return resolveCliSocketPath({
    userDirectory: defaultUserDirectory(),
    isWindows: process.platform === "win32",
    isDevelopment:
      dev && !["0", "false", "no", ""].includes(dev.trim().toLowerCase()),
  });
}
