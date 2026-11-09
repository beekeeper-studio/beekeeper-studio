/**
 * Setup file for plugin integration tests
 * This file sets up global mocks needed for plugin tests in jsdom environment
 */

// Mock PointerEvent which is not available in jsdom
if (typeof PointerEvent === "undefined") {
  global.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, params: any) {
      super(type, params);
    }
  } as any;
}

// Mock window.bksConfig - required by WebPluginManager
if (typeof window !== "undefined") {
  (window as any).bksConfig = {
    plugins: {},
  };
}
