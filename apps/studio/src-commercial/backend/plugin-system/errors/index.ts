export const NotSupportedPluginError = class extends Error {
  constructor(message: string) {
    super("Plugin not supported: " + message);
    this.name = "NotSupportedPluginError";
  }
};

export const NotFoundPluginError = class extends Error {
  constructor(message: string) {
    super("Plugin not found: " + message);
    this.name = "NotFoundPluginError";
  }
};
