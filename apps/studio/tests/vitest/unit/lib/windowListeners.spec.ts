import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addWindowListener, removeWindowListener, dispatchWindowClose, WindowListener } from "@/lib/windowListeners";

describe("windowListeners", () => {
  let added: WindowListener[];
  const add = (listener: WindowListener) => {
    added.push(listener);
    addWindowListener("close", listener);
  };

  beforeEach(() => {
    added = [];
    (globalThis as any).window.main = { setWindowListenerCount: vi.fn() };
  });

  afterEach(() => {
    added.forEach((listener) => removeWindowListener("close", listener));
  });

  it("reports the listener count to main on add and remove", () => {
    const listener = vi.fn();
    add(listener);
    add(vi.fn());
    removeWindowListener("close", listener);

    expect((window.main.setWindowListenerCount as any).mock.calls).toEqual([["close", 1], ["close", 2], ["close", 1]]);
  });

  it("ignores a listener added twice or removed without being added", () => {
    const listener = vi.fn();
    add(listener);
    add(listener);
    removeWindowListener("close", vi.fn());

    expect(window.main.setWindowListenerCount).toHaveBeenCalledTimes(1);
  });

  it("does not prevent the close when no listener asks for it", async () => {
    add(vi.fn());
    expect(await dispatchWindowClose()).toBe(false);
  });

  it("prevents the close when a listener calls preventClose", async () => {
    add(vi.fn());
    add(async ({ preventClose }) => preventClose());
    expect(await dispatchWindowClose()).toBe(true);
  });

  it("waits for each listener in order", async () => {
    const order: string[] = [];
    add(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push("first");
    });
    add(() => { order.push("second") });

    await dispatchWindowClose();
    expect(order).toEqual(["first", "second"]);
  });

  it("does not let a throwing listener block the close", async () => {
    add(() => { throw new Error("boom") });
    expect(await dispatchWindowClose()).toBe(false);
  });
});
