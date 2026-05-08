import path from "path";
import { Tray, Menu, nativeImage, NativeImage } from "electron";
import rawLog from "@bksLogger";
import { AiServerStatusPayload } from "@/types";

const log = rawLog.scope("TrayManager");

export interface TrayCallbacks {
  onShowWindow: () => void;
  onStopServer: () => void;
  onOpenAiServer: () => void;
  onQuit: () => void;
}

function trayIconPath(): string {
  // Mirrors WindowBuilder.getIcon(): icons live next to the build at ../public/icons/png.
  // Use 32x32 for trays — Linux/Windows pick this up cleanly; macOS gets a template image.
  return path.resolve(path.join(__dirname, "..", "public", "icons", "png", "32x32.png"));
}

function loadIcon(): NativeImage {
  try {
    const img = nativeImage.createFromPath(trayIconPath());
    if (process.platform === "darwin") {
      img.setTemplateImage(true);
    }
    return img;
  } catch (e) {
    log.warn("could not load tray icon", e);
    return nativeImage.createEmpty();
  }
}

export class TrayManager {
  private tray: Tray | null = null;
  private status: AiServerStatusPayload | null = null;
  private callbacks: TrayCallbacks;

  constructor(callbacks: TrayCallbacks) {
    this.callbacks = callbacks;
  }

  isShown(): boolean {
    return !!this.tray;
  }

  isServerRunning(): boolean {
    return !!this.status?.running;
  }

  setStatus(status: AiServerStatusPayload): void {
    this.status = status;
    if (status.running) {
      this.show();
      this.refreshMenu();
    } else {
      this.refreshMenu();
    }
  }

  show(): void {
    if (this.tray) return;
    try {
      this.tray = new Tray(loadIcon());
      this.tray.setToolTip("Beekeeper Studio AI Server");
      this.tray.on("click", () => this.callbacks.onShowWindow());
      this.refreshMenu();
    } catch (e) {
      log.warn("failed to create tray", e);
      this.tray = null;
    }
  }

  hide(): void {
    if (!this.tray) return;
    try { this.tray.destroy(); } catch (e) { log.warn("tray destroy failed", e); }
    this.tray = null;
  }

  destroy(): void {
    this.hide();
  }

  private refreshMenu(): void {
    if (!this.tray) return;
    const running = !!this.status?.running;
    const label = running
      ? `Status: running on ${this.status?.host}:${this.status?.port}`
      : "Status: stopped";
    const menu = Menu.buildFromTemplate([
      { label: "Beekeeper Studio AI Server", enabled: false },
      { label, enabled: false },
      { type: "separator" },
      { label: "Show Beekeeper Studio", click: () => this.callbacks.onShowWindow() },
      { label: "AI Server Settings…", click: () => this.callbacks.onOpenAiServer() },
      { label: "Stop AI Server", enabled: running, click: () => this.callbacks.onStopServer() },
      { type: "separator" },
      { label: "Quit Beekeeper Studio", click: () => this.callbacks.onQuit() },
    ]);
    this.tray.setContextMenu(menu);
    this.tray.setToolTip(running
      ? `Beekeeper AI server: ${this.status?.host}:${this.status?.port}`
      : "Beekeeper Studio AI Server (stopped)");
  }
}
