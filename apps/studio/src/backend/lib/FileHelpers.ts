import { dialog, ipcMain } from "electron/main";
import { writeFileSync } from "fs";

let initialized = false;

export type SaveFileOptions = {
  fileName: string;
  content: Buffer | Uint8Array | string;
  filters?: { name: string; extensions: string[] }[];
  /** @default utf8 */
  encoding?: string;
};

/** Save a file after showing a dialog */
async function save(options: SaveFileOptions) {
  const encoding = options.encoding ?? "utf8";

  const result = await dialog.showSaveDialog({
    defaultPath: options.fileName,
    filters: options.filters,
  });

  if (result.canceled) return false;

  writeFileSync(result.filePath, options.content, encoding);

  return true;
}

export function initializeFileHelpers() {
  if (initialized) return;

  ipcMain.handle("fileHelpers:save", (_event, params) => {
    save(params);
  });

  initialized = true;
}
