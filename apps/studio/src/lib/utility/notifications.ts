import type { Notification } from "@/lib/db/BaseCommandClient";
import type { ExportProgress } from "@/lib/export/models";
import type { DownloadProgress } from "@/services/driverDeps/types";
import type { CallHookMap } from "@/services/plugin/Module";

/**
 * Messages the utility process pushes to a window without being asked. Keys
 * ending in an id are per-tab or per-job; the rest go to the whole window.
 */
export interface NotificationMap {
  enumFileChanged: void;
  backupNotif: Notification;
  backupLog: string;
  [key: `onExportProgress/${string}`]: ExportProgress;
  [key: `onDriverDepProgress/${string}`]: DownloadProgress;
  [key: `transactionTimeoutWarning/${number}`]: void;
  [key: `transactionTimedOut/${number}`]: void;

  // Plugin system notifications
  afterInitializePluginManager: Parameters<CallHookMap["afterInitialize"]>;
};

export type NotificationType = keyof NotificationMap;

export type NotificationPayload<T extends NotificationType> =
  NotificationMap[T];
