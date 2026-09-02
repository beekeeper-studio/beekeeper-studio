import { states } from "@/handlers/handlerState";
import { NotificationMap, NotificationType } from "@/lib/utility/notifications";
import { Module, type ModuleOptions } from "@/services/plugin/Module";
import rawLog from "@bksLogger";

const log = rawLog.scope("NotificationModule");

/**
 * A plugin system module that forwards plugin manager events to the windows as
 * notifications.
 *
 * @example
 *
 * ```ts
 * const manager = new PluginManager();
 * manager.registerModule(NotificationModule);
 * await manager.initialize();
 * ```
 **/
export class NotificationModule extends Module {
  constructor(options: ModuleOptions) {
    super(options);

    this.hook("afterInitialize", (...args) =>
      this.broadcast("afterInitializePluginManager", args)
    );
  }

  broadcast<T extends NotificationType>(type: T, payload?: NotificationMap[T]) {
    for (const [id, state] of states) {
      if (!state.port) {
        continue;
      }
      try {
        state.port.postMessage({ type, input: payload });
      } catch (e) {
        log.warn(`Failed to broadcast "${type}" to session ${id}`, e);
      }
    }
  }
}
