import path from "path";
import { watch, FSWatcher } from "chokidar";
import FileManager from "@/services/plugin/FileManager";
import { ThemeManifest } from "@/services/plugin/types";

export type ThemeManagerOptions = {
  fileManager: FileManager<ThemeManifest>;
};

/** Handles external themes from the themes directory only, not the builtin ones. */
export class ThemeManager {
  public readonly fileManager: FileManager<ThemeManifest>;

  constructor(readonly options: ThemeManagerOptions) {
    this.fileManager = options.fileManager;
  }

  watch(themeId: string, onChange: () => void): FSWatcher {
    const stylePath = path.join(
      this.fileManager.getDirectoryOf(themeId),
      "style.css"
    );
    return watch(stylePath, { ignoreInitial: true }).on("change", onChange);
  }
}
