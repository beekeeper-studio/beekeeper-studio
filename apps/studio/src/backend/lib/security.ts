import { getActiveWindows } from "@/background/WindowBuilder";
import { AppEvent } from "@/common/AppEvent";
import bksConfig from "@/common/bksConfig";
import rawLog from "@bksLogger";
import { ipcMain, powerMonitor } from "electron";

const log = rawLog.scope("security");

let idleCheckInterval: NodeJS.Timer;

let initialized = false;

// Tracks the last time any Beekeeper window reported user input. powerMonitor's
// system idle time is unreliable on Linux (especially Wayland and tiling WMs)
// and can report the user as idle while they're actively using the app, so we
// combine it with renderer-reported activity (see the `userActive` IPC, which
// the renderer fires from real mousedown/keydown events).
let lastAppInputAt = Date.now();

function appIdleSeconds(): number {
  return Math.floor((Date.now() - lastAppInputAt) / 1000);
}

export function initializeSecurity() {
  if (initialized) {
    log.warn("Security already initialized");
    return;
  }

  if (bksConfig.security.disconnectOnIdle) {
    ipcMain.on("userActive", () => {
      lastAppInputAt = Date.now();
    });

    let hasDisconnectedWhileIdle = false;
    idleCheckInterval = setInterval(() => {
      const systemIdle = powerMonitor.getSystemIdleTime();
      const appIdle = appIdleSeconds();
      const effectiveIdle = Math.min(systemIdle, appIdle);
      const overThreshold =
        effectiveIdle > bksConfig.security.idleThresholdSeconds;

      if (!overThreshold) {
        hasDisconnectedWhileIdle = false;
        return;
      }

      if (hasDisconnectedWhileIdle) return;

      log.info(
        `User has been idle for ${effectiveIdle}s (system=${systemIdle}, app=${appIdle}), disconnecting.`
      );
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
