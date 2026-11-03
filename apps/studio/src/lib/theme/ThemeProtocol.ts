import { protocol } from "electron";
import * as path from "path";
import { promises as fs } from "fs";
import { URL } from "url";
import rawLog from "@bksLogger";
import platformInfo from "@/common/platform_info";
import { ThemeCompiler } from "./ThemeCompiler";

const log = rawLog.scope("ThemeProtocol");

export function createThemeProtocol(): void {
  protocol.handle("theme", async (request) => {
    const url = new URL(request.url);
    const themeId = path.basename(url.hostname, ".css");

    if (!/^[a-z0-9-]+$/.test(themeId)) {
      return new Response(null, { status: 404 });
    }

    try {
      const themePath = path.join(
        platformInfo.themesDirectory,
        `${themeId}.css`
      );
      const themeCss = await fs.readFile(themePath, "utf8");
      const compiler = new ThemeCompiler(themeCss);

      if (url.searchParams.has("preview")) {
        return new Response(compiler.compilePreview(themeId), {
          headers: { "Content-Type": "text/css" },
        });
      }
      return new Response(compiler.compile(), {
        headers: { "Content-Type": "text/css" },
      });
    } catch (error) {
      log.error("error loading theme", themeId, error);
      return new Response(null, { status: 404 });
    }
  });
}
