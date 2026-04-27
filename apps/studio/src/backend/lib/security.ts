import { getActiveWindows } from "@/background/WindowBuilder";
import { AppEvent } from "@/common/AppEvent";
import bksConfig from "@/common/bksConfig";
import rawLog from "@bksLogger";
import { app, powerMonitor, webContents, WebContents } from "electron";

const log = rawLog.scope("security");

let idleCheckInterval: NodeJS.Timer;

let initialized = false;

// Tracks the last time any Beekeeper window saw user input. powerMonitor's
// system idle time is unreliable on Linux (especially Wayland and tiling WMs)
// and can report the user as idle while they're actively typing in the app,
// so we combine the system signal with our own per-window input tracking.
let lastAppInputAt = Date.now();
const trackedContents = new WeakSet<WebContents>();

function trackInput(contents: WebContents) {
  if (trackedContents.has(contents) || contents.isDestroyed()) return;
  trackedContents.add(contents);
  // input-event fires at the OS input rate (mouseMove can be 60-120Hz). The
  // idle check only needs ~1s granularity, so throttle the timestamp update.
  contents.on("input-event", () => {
    const now = Date.now();
    if (now - lastAppInputAt > 1000) {
      lastAppInputAt = now;
    }
  });
}

function appIdleSeconds(): number {
  return Math.floor((Date.now() - lastAppInputAt) / 1000);
}

export function initializeSecurity() {
  if (initialized) {
    log.warn("Security already initialized");
    return;
  }

  if (bksConfig.security.disconnectOnIdle) {
    webContents.getAllWebContents().forEach(trackInput);
    app.on("web-contents-created", (_event, contents) => trackInput(contents));

    idleCheckInterval = setInterval(() => {
      const systemIdle = powerMonitor.getSystemIdleTime();
      const appIdle = appIdleSeconds();
      const effectiveIdle = Math.min(systemIdle, appIdle);
      if (effectiveIdle > bksConfig.security.idleThresholdSeconds) {
        log.info(
          `User has been idle for ${effectiveIdle}s (system=${systemIdle}, app=${appIdle}), disconnecting.`
        );
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
