import { MessageChannel, MessagePort } from "worker_threads"
import { newState, state } from "@/handlers/handlerState"

type Handler = (args: any) => Promise<any>

/**
 * Stands in for the Electron plumbing between the renderer and the utility
 * process, so the real UtilityConnection can talk to the real backend handlers
 * over a real MessageChannel:
 *
 *   main.ts    -> attach(): MessageChannelMain, one port to each side
 *   utility.ts -> run(): runHandler's reply/error protocol, keyed by request id
 *   crash      -> crash(): stop answering and close the utility-side ports
 *   restart    -> a new FakeUtilityProcess plus attach() for a fresh sId
 *                 (what createAndSendPorts(false, true) delivers to a window)
 */
export class FakeUtilityProcess {
  private alive = true
  private ports: MessagePort[] = []

  constructor(private handlers: Record<string, Handler>) {}

  /** Creates the window's backend State and returns the renderer-side port. */
  attach(sId: string): MessagePort {
    const { port1, port2 } = new MessageChannel()
    newState(sId)
    state(sId).port = port1 as any
    port1.on("message", ({ id, name, args }) => this.run(port1, id, name, args))
    this.ports.push(port1, port2)
    return port2
  }

  private async run(port: MessagePort, id: string, name: string, args: any) {
    if (!this.alive) return
    const reply: any = { id, type: "reply" }
    try {
      const handler = this.handlers[name] ?? this.fallback(name)
      reply.data = await handler(args)
    } catch (e) {
      reply.type = "error"
      reply.error = e?.message ?? e
      reply.errorName = e?.name
      reply.stack = e?.stack
    }
    if (this.alive) port.postMessage(reply)
  }

  // The store refreshes the connection sidebar after disconnecting; answer
  // those appdb lookups with nothing rather than pulling in the ORM.
  private fallback(name: string): Handler {
    if (name.startsWith("appdb/")) return async () => (name.endsWith("/find") ? [] : null)
    return async () => { throw new Error(`Invalid handler name: ${name}`) }
  }

  crash() {
    this.alive = false
    this.close()
  }

  close() {
    this.ports.forEach((p) => p.close())
    this.ports = []
  }
}
