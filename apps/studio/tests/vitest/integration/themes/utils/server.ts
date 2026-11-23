import http from "http";
import { ThemeManifest } from "@/services/plugin";
import JSZip from "jszip";

export function createThemeServer() {
  const server = new MockThemeServer();

  beforeAll(async () => {
    await server.run();
  });

  afterAll(async () => {
    await server.destroy();
  });

  return server;
}

export class MockThemeServer {
  server: http.Server | null = null;
  readyListeners: Function[] = [];
  running = false;

  async run() {
    if (this.server) {
      console.warn("ThemeMockServer already started");
    }

    this.server = http.createServer(async (req, res) => {
      try {
        const manifest = this.parseUrl(req.url);
        const zipFile = await this.createThemeZip(manifest);
        res.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Length": zipFile.length,
          "Access-Control-Allow-Origin": "*",
          "Content-Disposition": 'attachment; filename="theme.zip"',
        });
        res.end(zipFile);
      } catch (e) {
        console.error(e);
        res.writeHead(500, e.message).end();
      }
    });

    await new Promise<void>((resolve) => {
      this.server.listen(0, () => {
        this.running = true;
        this.readyListeners.forEach((listener) => listener());
        resolve();
      });
    });
  }

  formatUrl(options: ThemeManifest) {
    return `http://localhost:${this.port}/?theme=${JSON.stringify(options)}`;
  }

  parseUrl(url: string): ThemeManifest {
    const params = new URLSearchParams(url.slice(1));
    return JSON.parse(params.get("theme") || "{}");
  }

  get port() {
    if (!this.server) {
      return -1;
    }
    return (this.server.address() as any).port;
  }

  async destroy() {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve());
      });
    }
  }

  onReady(callback: () => void) {
    this.readyListeners.push(callback);
    if (this.running) {
      callback();
    }
  }

  private async createThemeZip(manifest: ThemeManifest): Promise<Buffer> {
    const zip = new JSZip();

    zip.file("manifest.json", JSON.stringify(manifest));
    zip.file("style.css", ".light-theme { --background: #fff; }");

    return await zip.generateAsync({ type: "nodebuffer" });
  }
}
