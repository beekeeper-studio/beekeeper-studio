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

  if (bksConfig.security.disconnectOnIdle) {
    idleCheckInterval = setInterval(() => {
      if (
        powerMonitor.getSystemIdleTime() >
        bksConfig.security.idleThresholdSeconds
      ) {
        log.info("User has been idle, disconnecting.");
        disconnect("User has been idle");
      }
    }, (bksConfig.security.idleCheckIntervalSeconds || 1) * 1000);
    log.info("Idle checker started");
  }

  if (bksConfig.security.disconnectOnSuspend) {
    powerMonitor.on("suspend", () => disconnect("System was suspended"));
    log.info("Suspend monitor started");
  }

  if (bksConfig.security.disconnectOnLock) {
    powerMonitor.on("lock-screen", () => disconnect("Screen was locked"));
    log.info("Lock monitor started");
  }

  initialized = true;
}

function disconnect(reason: string) {
  getActiveWindows().forEach((win) =>
    win.send(AppEvent.disconnect, {
      reason,
    })
  );
}
