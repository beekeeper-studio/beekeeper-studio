import fs from "fs";
import path from "path";
import platformInfo from "@/common/platform_info";
import rawLog from "@bksLogger";
import { AiServerPortFileV1 } from "./types";

const log = rawLog.scope("ai-server:portFile");

export function portFilePath(): string {
  return path.join(platformInfo.userDirectory, "ai-server.json");
}

export function writePortFile(data: AiServerPortFileV1): void {
  const target = portFilePath();
  const tmp = `${target}.tmp`;
  const body = JSON.stringify(data, null, 2);
  fs.writeFileSync(tmp, body, { mode: 0o600 });
  fs.renameSync(tmp, target);
  try {
    fs.chmodSync(target, 0o600);
  } catch (e) {
    log.warn("could not chmod ai-server.json", e);
  }
}

export function readPortFile(): AiServerPortFileV1 | null {
  try {
    const raw = fs.readFileSync(portFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
    return parsed as AiServerPortFileV1;
  } catch {
    return null;
  }
}

export function removePortFile(): void {
  try {
    fs.unlinkSync(portFilePath());
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      log.warn("could not remove ai-server.json", e);
    }
  }
}

export function isStalePortFile(file: AiServerPortFileV1): boolean {
  if (!file?.pid) return true;
  try {
    process.kill(file.pid, 0);
    return false;
  } catch {
    return true;
  }
}
