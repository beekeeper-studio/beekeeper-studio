import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { EventEmitter } from "events";
import { WindowCloseGuard, WindowCloseState } from "@/background/lib/electron/WindowCloseGuard";
import { AppEvent } from "@/common/AppEvent";

class FakeWebContents extends EventEmitter {
  destroyed = false;
  send = vi.fn();
  isDestroyed() { return this.destroyed }
}

class FakeWindow extends EventEmitter {
  webContents = new FakeWebContents();
  closed = false;
  closeCalls = 0;

  constructor(private asyncClose = false) { super() }

  isDestroyed() { return this.closed }

  /** Like Electron: emits a preventable `close`, then goes away. */
  close() {
    this.closeCalls++;
    const run = () => {
      if (this.closed) return;
      const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true } };
      this.emit("close", event);
      if (event.defaultPrevented) return;
      this.closed = true;
      this.webContents.destroyed = true;
      this.webContents.emit("destroyed");
    };
    if (this.asyncClose) setTimeout(run, 0);
    else run();
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe("WindowCloseGuard", () => {
  let ipcMain: EventEmitter;
  let app: { quit: Mock<() => void> };
  let state: WindowCloseState;

  function setup(win: FakeWindow, listeners = 1) {
    const guard = new WindowCloseGuard(win as any, ipcMain as any, app as any, state);
    guard.listenerCount = listeners;
    return guard;
  }

  const answer = (win: FakeWindow, prevented: boolean) =>
    ipcMain.emit(AppEvent.windowCloseResponse, { sender: win.webContents }, prevented);

  beforeEach(() => {
    ipcMain = new EventEmitter();
    app = { quit: vi.fn<() => void>() };
    state = { bypassed: false, quitRequested: false };
  });

  it("closes without asking when there are no listeners", () => {
    const win = new FakeWindow();
    setup(win, 0);

    win.close();

    expect(win.webContents.send).not.toHaveBeenCalled();
    expect(win.closed).toBe(true);
  });

  it("closes without asking when bypassed", () => {
    const win = new FakeWindow();
    setup(win);
    state.bypassed = true;

    win.close();

    expect(win.closed).toBe(true);
  });

  it("keeps the window open when a listener prevents the close", async () => {
    const win = new FakeWindow();
    setup(win);

    win.close();
    expect(win.webContents.send).toHaveBeenCalledWith(AppEvent.windowClose);
    answer(win, true);
    await tick();

    expect(win.closed).toBe(false);
    expect(win.closeCalls).toBe(1);
  });

  it("asks again on the next close after a prevented one", async () => {
    const win = new FakeWindow();
    setup(win);

    win.close();
    answer(win, true);
    await tick();
    win.close();

    expect(win.webContents.send).toHaveBeenCalledTimes(2);
  });

  it.each([false, true])("closes once the listeners allow it (close emitted async: %s)", async (asyncClose) => {
    const win = new FakeWindow(asyncClose);
    setup(win);

    win.close();
    await tick();
    answer(win, false);
    await tick();

    expect(win.closed).toBe(true);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);
    expect(app.quit).not.toHaveBeenCalled();
  });

  it("shares one request between overlapping close attempts", async () => {
    const win = new FakeWindow();
    setup(win);

    win.close();
    win.close();
    answer(win, false);
    await tick();

    expect(win.webContents.send).toHaveBeenCalledTimes(1);
    expect(win.closed).toBe(true);
  });

  it("ignores an answer from another window", async () => {
    const win = new FakeWindow();
    setup(win);

    win.close();
    answer(new FakeWindow(), false);
    await tick();

    expect(win.closed).toBe(false);
  });

  it.each(["render-process-gone", "unresponsive", "did-navigate"])("closes when the renderer is gone (%s)", async (event) => {
    const win = new FakeWindow();
    setup(win);

    win.close();
    win.webContents.emit(event);
    await tick();

    expect(win.closed).toBe(true);
  });

  it("forgets the listeners when the page reloads", () => {
    const win = new FakeWindow();
    const guard = setup(win);

    win.webContents.emit("did-navigate");

    expect(guard.listenerCount).toBe(0);
  });

  it.each([false, true])("resumes a quit exactly once after the listeners allow it (close emitted async: %s)", async (asyncClose) => {
    const win = new FakeWindow(asyncClose);
    setup(win);
    // like Electron: quitting closes every window, and a prevented close cancels the quit
    app.quit.mockImplementation(() => {
      state.quitRequested = true;
      win.close();
    });

    app.quit();
    await tick();
    expect(win.closed).toBe(false);
    answer(win, false);
    await tick();
    await tick();

    expect(app.quit).toHaveBeenCalledTimes(2);
    expect(win.closed).toBe(true);
    expect(win.webContents.send).toHaveBeenCalledTimes(1);
  });

  it("drops the quit when a listener prevents the close", async () => {
    const win = new FakeWindow();
    setup(win);
    state.quitRequested = true;

    win.close();
    answer(win, true);
    await tick();

    expect(state.quitRequested).toBe(false);
    expect(app.quit).not.toHaveBeenCalled();
  });
});
