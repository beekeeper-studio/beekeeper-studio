import { uuidv4 } from "@/lib/uuid";
import type { MessagePortMain as ElectronPort } from "electron";
import type { Reply } from "@beekeeperstudio/cli";
import type { Method, Notification, Request } from "./types";

/** Thrown by RpcServer.call when the request was cancelled before it finished. */
export class CancelError extends Error {
  constructor(
    readonly requestId: string,
    message = "The request was cancelled.",
  ) {
    super(message);
    this.name = "CancelError";
  }
}

/** Thrown by RpcServer.call when nothing is registered under the name. */
export class UnknownMethodError extends Error {
  constructor(readonly method: string, readonly methods: string[]) {
    super(`Unknown method "${method}".`);
    this.name = "UnknownMethodError";
  }
}

function rejectWithReason(
  reject: (reason: unknown) => void,
  signal: AbortSignal,
): void {
  reject(signal.reason);
}

/** Handles requests from RpcClient over a message port. */
export class RpcServer<
  MethodMap extends Record<keyof MethodMap, Method> = Record<string, Method>,
> {
  private readonly handlers = new Map<keyof MethodMap, MethodMap[keyof MethodMap]>();
  private readonly runningRequests = new Map<string, AbortController>();

  constructor(private readonly port: ElectronPort | MessagePort) {
    this.handleMessage = this.handleMessage.bind(this);
  }

  initialize(): void {
    if ("addEventListener" in this.port) {
      this.port.addEventListener("message", this.handleMessage);
    } else {
      this.port.addListener("message", this.handleMessage);
    }
  }

  register<K extends keyof MethodMap>(name: K, handler: MethodMap[K]): void {
    this.handlers.set(name, handler);
  }

  /** Removes the handler only if it is still the one registered under `name`. */
  unregister<K extends keyof MethodMap>(name: K, handler: MethodMap[K]): void {
    if (this.handlers.get(name) === handler) {
      this.handlers.delete(name);
    }
  }

  cancel(id: string): void {
    this.runningRequests.get(id)?.abort(new CancelError(id));
  }

  cancelAll(message?: string): void {
    for (const [id, controller] of this.runningRequests) {
      controller.abort(new CancelError(id, message));
    }
  }

  /**
   * Runs the handler registered under `name` with `args`, plus a last
   * argument: a signal that `cancel(id)` aborts.
   */
  private async call<K extends keyof MethodMap>(
    id: string,
    name: K,
    ...args: unknown[]
  ): Promise<Awaited<ReturnType<MethodMap[K]>>> {
    const handler = this.handlers.get(name);
    if (!handler) {
      const methods = [...this.handlers.keys()].map(String);
      throw new UnknownMethodError(String(name), methods);
    }
    const controller = new AbortController();
    this.runningRequests.set(id, controller);
    // The handler may ignore the signal, so stop waiting on it once aborted
    const cancelled = Promise.withResolvers<never>();
    controller.signal.addEventListener(
      "abort",
      rejectWithReason.bind(null, cancelled.reject, controller.signal),
      { once: true },
    );
    try {
      const result = await Promise.race([
        handler(...args, controller.signal),
        cancelled.promise,
      ]);
      return result as Awaited<ReturnType<MethodMap[K]>>;
    } finally {
      this.runningRequests.delete(id);
    }
  }

  private handleMessage(event: { data: any }): void {
    if (event.data?.type === "rpc/request") {
      this.handleRequest(event.data.input);
    } else if (event.data?.type === "rpc/notify") {
      this.handleNotify(event.data.input);
    }
  }

  private async handleRequest(request: Request): Promise<void> {
    try {
      const name = request.name as keyof MethodMap;
      const data = await this.call(request.id, name, request.args);
      const reply: Reply = { id: request.id, type: "reply", data };
      this.port.postMessage({ type: "rpc/respond", input: reply });
    } catch (e) {
      const reply: Reply = {
        id: request.id,
        type: "error",
        error: e?.message ?? String(e),
        errorName: e?.name,
        errorCode: e?.code,
      };
      this.port.postMessage({ type: "rpc/respond", input: reply });
    }
  }

  private async handleNotify(notification: Notification): Promise<void> {
    if (notification.name === "$/cancel") {
      const args = notification.args as { id: string };
      this.cancel(args.id);
      return;
    }
    const name = notification.name as keyof MethodMap;
    try {
      await this.call(uuidv4(), name, notification.args);
    } catch (e) {
      console.error(`Notification ${notification.name} failed`, e);
    }
  }
}
