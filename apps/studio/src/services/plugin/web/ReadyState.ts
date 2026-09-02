import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import { PluginSystemError } from "@/lib/errors";
import globals from "@/common/globals";

/**
 * Tracks whether the backend's plugin manager has finished initializing.
 *
 * @example
 *
 * ```ts
 * const state = new ReadyState(utilityConnection);
 * await state.wait();
 * ```
 **/
export default class ReadyState {
  private ready = false;
  private readonly readySignal = Promise.withResolvers<void>();

  constructor(private readonly util: UtilityConnection) {
    this.util.addListener("afterInitializePluginManager", () =>
      this.markReady()
    );
  }

  /** Resolves once the backend's plugin manager is ready.
   * @throws if it is not ready within `globals.plugins.initTimeout` */
  async wait() {
    if (this.ready) {
      return;
    }

    // The event may have fired before this window's port was attached.
    if (await this.util.send("plugin/initialized")) {
      this.markReady();
      return;
    }

    const timeout = Promise.withResolvers<never>();
    const timeoutId = setTimeout(() => {
      timeout.reject(
        new PluginSystemError(
          "INIT_TIMEOUT",
          "Plugin initialization timed out"
        )
      );
    }, globals.plugins.initTimeout);

    try {
      await Promise.race([this.readySignal.promise, timeout.promise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private markReady() {
    this.ready = true;
    this.readySignal.resolve();
  }
}
