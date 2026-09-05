import fs from "fs";
import platformInfo from "@/common/platform_info";

export class ThemeManager {
  initialize() {
    if (!fs.existsSync(platformInfo.themesDirectory)) {
      fs.mkdirSync(platformInfo.themesDirectory, { recursive: true });
    }

  }
}
