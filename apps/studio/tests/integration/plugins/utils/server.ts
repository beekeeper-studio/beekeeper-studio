import http from "http";
import { Manifest } from "@/services/plugin";
import JSZip from "jszip";
import { buildSignatureFiles } from "./signing";

/**
 * How the mock server signs the plugin zips it serves:
 * - `none`: ship no signature (an unsigned plugin — the default).
 * - `valid`: ship a valid `signature.json` + `.asc`.
 * - `tampered`: sign the original files but ship a modified file, so the hash
 *   no longer matches (contents tampered after signing).
 * - `wrong-id`: ship a valid signature whose payload id is a different plugin.
 */
export type SignatureMode = "none" | "valid" | "tampered" | "wrong-id";

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

  /** Armored OpenPGP private key used to sign zips. Required for any mode
   * other than "none". */
  signingPrivateKey?: string;
  /** How served zips are signed. Defaults to unsigned. */
  signatureMode: SignatureMode = "none";

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

    const manifestContent = Buffer.from(JSON.stringify(manifest));
    const indexContent = Buffer.from("Hello, I'm inside an HTML file!");
    zip.file("manifest.json", manifestContent);
    zip.file("index.html", indexContent);

    if (this.signatureMode !== "none") {
      if (!this.signingPrivateKey) {
        throw new Error(
          `signatureMode is "${this.signatureMode}" but no signingPrivateKey is set`
        );
      }
      const { signatureJson, signatureAsc } = await buildSignatureFiles({
        id: manifest.id,
        version: manifest.version,
        files: { "manifest.json": manifestContent, "index.html": indexContent },
        privateKey: this.signingPrivateKey,
        overrideId:
          this.signatureMode === "wrong-id" ? "some-other-plugin" : undefined,
      });

      if (this.signatureMode === "tampered") {
        // Sign the original files, then ship a modified one -> hash mismatch.
        zip.file("index.html", Buffer.from("TAMPERED CONTENT"));
      }

      zip.file("signature.json", signatureJson);
      zip.file("signature.json.asc", signatureAsc);
    }

    return await zip.generateAsync({ type: "nodebuffer" });
  }
}
