import { getActiveWindows } from "@/background/WindowBuilder";
import { AppEvent } from "@/common/AppEvent";
import bksConfig from "@/common/bksConfig";
import rawLog from "@bksLogger";
import { powerMonitor } from "electron";

const log = rawLog.scope("security");

let idleCheckInterval: NodeJS.Timer;

let initialized = false;

export function initializeSecurity() {
  if (initialized) {
    log.warn("Security already initialized");
    return;
  }

  idleCheckInterval = setInterval(
    idleChecker,
    bksConfig.security.idleCheckIntervalSeconds
  );

  initialized = true;
}

function idleChecker() {
  if (
    powerMonitor.getSystemIdleTime() > bksConfig.security.idleThresholdSeconds
  ) {
    log.info("Idle threshold reached.");
    getActiveWindows().forEach((win) => win.send(AppEvent.disconnect, {
      reason: "Idle threshold reached.",
    }));
  }
}
