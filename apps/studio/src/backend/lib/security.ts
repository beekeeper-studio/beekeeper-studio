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

  if (bksConfig.security.lockMode !== "disabled") {
    if (bksConfig.security.disconnectOnIdle) {
      idleCheckInterval = setInterval(
        idleChecker,
        bksConfig.security.idleCheckIntervalSeconds
      );
      log.info("Idle checker started");
    }

    if (bksConfig.security.disconnectOnSuspend) {
      powerMonitor.on("suspend", disconnect);
      log.info("Suspend monitor started");
    }

    if (bksConfig.security.disconnectOnLock) {
      powerMonitor.on("lock-screen", disconnect);
      log.info("Lock monitor started");
    }
  }

  initialized = true;
}

function idleChecker() {
  if (
    powerMonitor.getSystemIdleTime() > bksConfig.security.idleThresholdSeconds
  ) {
    log.info("Idle threshold reached.");
    disconnect();
  }
}

function disconnect() {
  getActiveWindows().forEach((win) =>
    win.send(AppEvent.disconnect, {
      reason: "Idle threshold reached.",
    })
  );
}
