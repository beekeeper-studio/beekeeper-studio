import http, { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import rawLog from "@bksLogger";
import bksConfig from "@/common/bksConfig";
import { dispatch } from "./router";
import { extractBearer, verifyToken } from "./auth";

const log = rawLog.scope("ai-server:http");

const MAX_BODY = 16 * 1024 * 1024;

export interface HttpServerOptions {
  host: string;
  port: number;
  portScanRange: number;
  token: string;
}

export interface RunningHttpServer {
  host: string;
  port: number;
  close(): Promise<void>;
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (c: Buffer) => {
      total += c.length;
      if (total > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (total === 0) return resolve(null);
      try {
        const txt = Buffer.concat(chunks).toString("utf8");
        resolve(txt.length ? JSON.parse(txt) : null);
      } catch (e) {
        reject(new Error("invalid json body"));
      }
    });
    req.on("error", reject);
  });
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body ?? null);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload).toString(),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(payload);
}

async function tryListen(server: http.Server, host: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (e: NodeJS.ErrnoException) => {
      server.removeListener("listening", onListening);
      reject(e);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      resolve(port);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

export async function startHttpServer(opts: HttpServerOptions): Promise<RunningHttpServer> {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host || `${opts.host}:${opts.port}`}`);
      const pathname = url.pathname;
      const method = (req.method ?? "GET").toUpperCase();

      if (method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (method === "GET" && pathname === "/v1/health") {
        writeJson(res, 200, { ok: true, name: "beekeeper-ai-server" });
        return;
      }

      const presented = extractBearer(req.headers["authorization"] as string | undefined);
      if (!verifyToken(presented, opts.token)) {
        writeJson(res, 401, { error: "unauthorized", message: "Bearer token required" });
        return;
      }

      let body: unknown = null;
      if (method === "POST" || method === "PUT") {
        try {
          body = await readJsonBody(req);
        } catch (e) {
          writeJson(res, 400, { error: "bad_request", message: (e as Error).message });
          return;
        }
      }

      const tokenPrefix = opts.token.slice(0, 8);
      const result = await dispatch(method, pathname, url, req, body, { tokenPrefix });
      writeJson(res, result.status, result.body);
    } catch (e) {
      log.error("unhandled request error", e);
      writeJson(res, 500, { error: "internal", message: (e as Error).message });
    }
  });

  server.keepAliveTimeout = 5_000;
  server.requestTimeout = 60_000;

  let lastErr: Error | null = null;
  const range = Math.max(1, opts.portScanRange);
  for (let i = 0; i < range; i++) {
    const port = opts.port + i;
    try {
      const bound = await tryListen(server, opts.host, port);
      log.info(`AI server listening on http://${opts.host}:${bound}`);
      return {
        host: opts.host,
        port: bound,
        close(): Promise<void> {
          return new Promise<void>((resolve) => server.close(() => resolve()));
        },
      };
    } catch (e) {
      lastErr = e as Error;
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== "EADDRINUSE") break;
    }
  }
  throw lastErr ?? new Error("could not bind any port");
}
