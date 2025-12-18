import http from "http";
import { Manifest } from "@/services/plugin";
import JSZip from "jszip";

export function createPluginServer() {
  const server = new MockPluginServer();

  beforeAll(async () => {
    await server.run();
  });

  afterAll(async () => {
    await server.destroy();
  });

  return server;
}

export class MockPluginServer {
  server: http.Server | null = null;
  readyListeners: Function[] = [];
  running = false;

  async run() {
    if (this.server) {
      console.warn("PluginMockServer already started");
    }

    this.server = http.createServer(async (req, res) => {
      try {
        const manifest = this.parseUrl(req.url);
        const zipFile = await this.createPluginZip(manifest);
        res.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Length": zipFile.length,
          "Access-Control-Allow-Origin": "*",
          "Content-Disposition": 'attachment; filename="plugin.zip"',
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

  formatUrl(options: Manifest) {
    return `http://localhost:${this.port}/?plugin=${JSON.stringify(options)}`;
  }

  parseUrl(url: string): Manifest {
    const params = new URLSearchParams(url.slice(1));
    return JSON.parse(params.get("plugin") || "{}");
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

  private async createPluginZip(manifest: Manifest): Promise<Buffer> {
    const zip = new JSZip();

    zip.file("manifest.json", JSON.stringify(manifest));
    zip.file("index.html", "Hello, I'm inside an HTML file!");

    return await zip.generateAsync({ type: "nodebuffer" });
  }
}
