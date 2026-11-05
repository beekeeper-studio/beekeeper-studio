import { protocol } from "electron";
import * as path from "path";
import fs from "fs/promises";
import { URL } from "url";
import rawLog from "@bksLogger";
import platformInfo from "@/common/platform_info";
import globals from "@/common/globals";
import { ThemeCompiler } from "@/services/theme/ThemeCompiler";

const log = rawLog.scope("ThemeProtocol");

const ASSET_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".svgz": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
};

/** Serves `theme://<theme-id>/<path>` from bundled themes and the themes folder. */
export class ThemeProtocol {
  register() {
    protocol.handle("theme", async (request) => {
      try {
        return await this.serve(new URL(request.url));
      } catch (error) {
        log.debug("error loading theme file", request.url, error);
        return new Response(null, { status: 404 });
      }
    });
  }

  private async serve(url: URL): Promise<Response> {
    const themeId = url.hostname;
    const segments = this.parsePath(url.pathname);

    if (!segments) {
      return new Response(null, { status: 404 });
    }

    const isStylesheet = segments.length === 1 && segments[0] === "style.css";

    if (globals.themes.bundled.some((theme) => theme.id === themeId)) {
      if (!isStylesheet) {
        return new Response(null, { status: 404 });
      }
      const css = await fs.readFile(
        path.join(platformInfo.builtinThemesDirectory, themeId, "style.css"),
        "utf8"
      );
      return this.respond(this.compile(css, themeId, url), "text/css");
    }

    // The theme folder itself may be a symlink, so both sides must be real paths.
    const root = await fs.realpath(path.join(platformInfo.themesDirectory, themeId));
    const file = await fs.realpath(path.join(root, ...segments));
    if (!file.startsWith(root + path.sep) || !(await fs.stat(file)).isFile()) {
      return new Response(null, { status: 404 });
    }

    if (isStylesheet) {
      const css = await fs.readFile(file, "utf8");
      return this.respond(this.compile(css, themeId, url), "text/css");
    }

    const extension = path.extname(file).toLowerCase();
    if (extension === ".css") {
      const css = await fs.readFile(file, "utf8");
      return this.respond(new ThemeCompiler(css).sanitize(), "text/css");
    }

    const contentType = ASSET_TYPES[extension] ?? "application/octet-stream";
    return this.respond(await fs.readFile(file), contentType);
  }

  private parsePath(pathname: string): string[] | null {
    const segments = pathname.slice(1).split("/").map(decodeURIComponent);
    const safe = segments.every(
      (segment) =>
        segment && segment !== "." && segment !== ".." && !/[\\/:\0]/.test(segment)
    );
    return safe ? segments : null;
  }

  private compile(css: string, themeId: string, url: URL): string {
    const compiler = new ThemeCompiler(css);
    return url.searchParams.has("preview")
      ? compiler.compilePreview(themeId)
      : compiler.compile();
  }

  private respond(body: string | Buffer, contentType: string): Response {
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        // Browsers fetch fonts with CORS, even from a theme's own stylesheet.
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
