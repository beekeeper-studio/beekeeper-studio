export const NotSupportedPluginError = class extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotSupportedPluginError";
  }
};

export const NotFoundPluginError = class extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundPluginError";
  }
};

export const NotFoundPluginViewError = class extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundPluginViewError";
  }
};

export const PluginFetchError = class extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginFetchError";
  }
};

export const PluginTimeoutError = class extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginTimeoutError";
  }
};

export const PluginSystemDisabledError = class extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "PluginSystemDisabledError";
  }
};
