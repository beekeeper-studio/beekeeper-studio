/**
 * Wraps a MessagePort to look like a Worker, so we can use the same
 * BrowserMessageReader/Writer code paths in tests as in production
 * (where the host actually has a real Worker).
 */
export class PortAsWorker {
  constructor(private port: MessagePort) {
    // MessagePort doesn't auto-start receiving — we have to call start()
    // (or assign onmessage). Calling it explicitly is the well-defined path.
    port.start();
  }

  postMessage(msg: unknown): void {
    this.port.postMessage(msg);
  }

  addEventListener(type: string, handler: any): void {
    this.port.addEventListener(type as "message", handler);
  }

  removeEventListener(type: string, handler: any): void {
    this.port.removeEventListener(type as "message", handler);
  }

  set onmessage(handler: any) {
    this.port.onmessage = handler;
  }
  get onmessage(): any {
    return this.port.onmessage;
  }

  set onerror(_handler: any) {
    // noop — the underlying port doesn't have a comparable concept.
  }

  terminate(): void {
    this.port.close();
  }
}
