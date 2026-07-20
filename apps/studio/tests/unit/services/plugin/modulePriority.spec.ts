import { Hookable } from "@/services/plugin/Hookable";
import { Module, ModuleClass, ModuleOptions } from "@/services/plugin/Module";

describe("Module priority", () => {
  it("runs higher-priority modules before lower-priority ones", async () => {
    const order: string[] = [];

    class LowPriority extends Module {
      readonly priority: number = 1;
      constructor(options: ModuleOptions) {
        super(options);
        this.hook("before-initialize", () => {
          order.push("low");
        });
      }
    }

    class HighPriority extends Module {
      readonly priority: number = 10;
      constructor(options: ModuleOptions) {
        super(options);
        this.hook("before-initialize", () => {
          order.push("high");
        });
      }
    }

    class Host extends Hookable {
      add(cls: ModuleClass) {
        // registerModule is typed for PluginManager; cast for this bare host.
        (this as any).registerModule(cls);
      }
      run() {
        return this.callHook("before-initialize");
      }
    }

    const host = new Host();
    // Registered low-then-high; priority, not registration order, must decide.
    host.add(LowPriority);
    host.add(HighPriority);
    await host.run();

    expect(order).toEqual(["high", "low"]);
  });
});
