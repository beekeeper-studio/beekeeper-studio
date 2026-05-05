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
    let hasDisconnectedWhileIdle = false;
    idleCheckInterval = setInterval(() => {
      const overThreshold =
        powerMonitor.getSystemIdleTime() >
        bksConfig.security.idleThresholdSeconds;

      if (!overThreshold) {
        hasDisconnectedWhileIdle = false;
        return;
      }

      if (hasDisconnectedWhileIdle) return;

      log.info("User has been idle, disconnecting.");
      disconnect("User has been idle");
      hasDisconnectedWhileIdle = true;
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
