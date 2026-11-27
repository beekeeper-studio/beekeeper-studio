import { CancelError, CliError } from "./protocol";
import type {
  Method,
  Notification,
  Port,
  Reply,
  Request,
  RequestOptions,
} from "./protocol";

/**
 * Calls the methods a RpcServer registered, over any port that reaches
 * that renderer. Replies come back over the same port.
 */
export class RpcClient<
  MethodMap extends Record<keyof MethodMap, Method> = Record<string, Method>,
> {
  private listenerCount = 0;

  constructor(private readonly port: Port) { }

  request<K extends keyof MethodMap & string>(
    name: K,
    args?: Parameters<MethodMap[K]>[0],
    options: RequestOptions = {},
  ): Promise<Awaited<ReturnType<MethodMap[K]>>> {
    const id = options.id ?? crypto.randomUUID();
    const { resolve, reject, promise } = Promise.withResolvers<any>();

    const onAbort = () => this.cancel(id);
    const onMessage = (event: { data: unknown }) => {
      if (
        !(
          typeof event.data === "object" &&
          "type" in event.data &&
          event.data.type === "response"
        )
      ) {
        return;
      }

      const reply = event.data["input"] as unknown as Reply;
      if (reply.id !== id) {
        return;
      }

      // Cleanup first, then respond
      if ("removeEventListener" in this.port) {
        this.port.removeEventListener("message", onMessage);
      } else {
        this.port.removeListener("message", onMessage);
      }
      this.listenerCount--;
      options.signal?.removeEventListener("abort", onAbort);

      if (reply.errorName === "CancelError") {
        reject(new CancelError(id, reply.error));
      } else if (reply.errorName === "CliError") {
        reject(
          new CliError(reply.errorCode, reply.error, {
            hint: reply.errorHint,
            details: reply.errorDetail,
          }),
        );
      } else if (reply.type === "error") {
        const error = new Error(reply.error);
        reject(Object.assign(error, { code: reply.errorCode }));
      } else {
        resolve(reply.data);
      }
    };

    if ("addEventListener" in this.port) {
      this.port.addEventListener("message", onMessage);
    } else {
      this.port.addListener("message", onMessage);
    }

    this.listenerCount++;
    options.signal?.addEventListener("abort", onAbort, { once: true });

    const request: Request = { id, name, args };
    this.port.postMessage({ type: "request", input: request });

    return promise;
  }

  /** Runs the handler registered under `name` without waiting for a reply. */
  private notify(name: string, args?: unknown): void {
    const notification: Notification = { name, args };
    this.port.postMessage({ type: "notification", input: notification });
  }

  /** Asks the server to abort the handler. The server's reply settles it. */
  cancel(id: string): void {
    this.notify("$/cancel", { id });
  }

  getListenerCount() {
    return this.listenerCount;
  }
}
