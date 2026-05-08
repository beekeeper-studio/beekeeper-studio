import { readFileSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

export interface DiscoveryFile {
  version: 1;
  host: string;
  port: number;
  pid: number;
  appVersion: string;
  startedAt: string;
  /** True when the Beekeeper server expects a Bearer token. */
  requireToken: boolean;
}

export class DiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscoveryError";
  }
}

export function discoveryPath(): string {
  const explicit = process.env.BEEKEEPER_AI_SERVER_FILE;
  if (explicit) return explicit;

  const p = platform();
  if (p === "darwin") {
    return join(homedir(), "Library", "Application Support", "beekeeper-studio", "ai-server.json");
  }
  if (p === "win32") {
    const appData = process.env.APPDATA;
    if (!appData) throw new DiscoveryError("APPDATA is not set");
    return join(appData, "beekeeper-studio", "ai-server.json");
  }
  const xdg = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(xdg, "beekeeper-studio", "ai-server.json");
}

export function readDiscovery(): DiscoveryFile {
  const path = discoveryPath();
  let raw: string;
  try {
    statSync(path);
    raw = readFileSync(path, "utf8");
  } catch (e: any) {
    throw new DiscoveryError(
      `Beekeeper AI server is not running. Expected ${path} to exist.\n` +
      `Open Beekeeper Studio -> Tools -> AI Server… and click Start server.`
    );
  }
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e: any) {
    throw new DiscoveryError(`Could not parse ${path}: ${e.message}`);
  }
  if (parsed?.version !== 1 || !parsed.port || !parsed.host) {
    throw new DiscoveryError(`${path} is malformed or from an incompatible version.`);
  }
  return {
    version: 1,
    host: parsed.host,
    port: parsed.port,
    pid: parsed.pid ?? 0,
    appVersion: parsed.appVersion ?? "unknown",
    startedAt: parsed.startedAt ?? "",
    requireToken: parsed.requireToken !== false,
  };
}
