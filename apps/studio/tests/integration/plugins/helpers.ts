import fs from "fs";
import path from "path";
import http from "http";
import { Manifest, PluginRegistryEntry } from "@/services/plugin";
import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import { tmpdir } from "os";
import { uuidv4 } from "@/lib/uuid";

const testManifest: Manifest = {
  id: "test-plugin",
  name: "Test Plugin",
  version: "1.0.0",
  author: "John Doe",
  description: "This is a test plugin.",
  minAppVersion: "1.0.0",
};

const testEntry: PluginRegistryEntry = {
  id: "test-plugin",
  name: "Test Plugin",
  description: "This is a test plugin.",
  author: "John Doe",
  repo: "johndoe/test-plugin",
};

export function mockPluginServer() {
  let server: http.Server;
  let serverPort: number;
  const TEST_SERVER_URL = () => `http://localhost:${serverPort}/plugin.zip`;

  beforeAll(async () => {
    // Start test server that serves the test-plugin.zip file
    const zipFilePath = path.join(__dirname, "../../fixtures/test-plugin.zip");

    server = http.createServer((req, res) => {
      if (req.url === "/plugin.zip") {
        if (fs.existsSync(zipFilePath)) {
          const zipFile = fs.readFileSync(zipFilePath);
          res.writeHead(200, {
            "Content-Type": "application/zip",
            "Content-Length": zipFile.length,
            "Access-Control-Allow-Origin": "*",
            "Content-Disposition": 'attachment; filename="plugin.zip"',
          });
          res.end(zipFile);
        } else {
          res.writeHead(404);
          res.end("ZIP file not found");
        }
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = (server.address() as any).port;
        resolve();
      });
    });
    jest
      .spyOn(PluginRegistry.prototype, "getEntries")
      .mockResolvedValue([testEntry]);
    jest
      .spyOn(PluginFileManager.prototype, "getManifest")
      .mockReturnValue(testManifest);
    jest
      .spyOn(PluginRepositoryService.prototype, "fetchPluginRepository")
      .mockResolvedValue({
        latestRelease: {
          manifest: testManifest,
          sourceArchiveUrl: TEST_SERVER_URL(),
        },
        readme: "This is a test plugin.",
      });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });
}

export function tmpDir() {
  const randomDir = path.join(tmpdir(), uuidv4());
  fs.mkdirSync(randomDir, { recursive: true });
  return randomDir;
}

export function cleanTmpDir(dir?: string) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

