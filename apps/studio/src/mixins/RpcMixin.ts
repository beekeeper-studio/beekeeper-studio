import type { Method } from "@beekeeperstudio/rpc";

/**
 * Registers every handler in a component's `rpcMethods` on `$server` when it
 * mounts, and unregisters them before it is destroyed.
 */
export const RpcMixin = {
  mounted() {
    const rpcMethods: Record<string, Method>[] | undefined = this.rpcMethods;
    if (!rpcMethods) {
      return;
    }
    for (const methods of rpcMethods) {
      for (const [name, handler] of Object.entries(methods)) {
        this.$server.register(name, handler);
      }
    }
  },
  beforeDestroy() {
    const rpcMethods: Record<string, Method>[] | undefined = this.rpcMethods;
    if (!rpcMethods) {
      return;
    }
    for (const methods of rpcMethods) {
      for (const [name, handler] of Object.entries(methods)) {
        this.$server.unregister(name, handler);
      }
    }
  },
};
