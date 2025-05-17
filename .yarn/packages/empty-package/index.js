// Empty package to substitute for native modules
// Specifically designed for SQLAnywhere and other platform-specific native modules

// Mock SQLAnywhere API
module.exports = {
  createConnection: function () {
    console.warn("SQLAnywhere module not available - using empty package");
    return {
      connect: function () {
        return Promise.reject(
          new Error("SQLAnywhere not supported on this platform")
        );
      },
      disconnect: function () {
        return Promise.resolve();
      },
      exec: function () {
        return Promise.reject(
          new Error("SQLAnywhere not supported on this platform")
        );
      },
      commit: function () {
        return Promise.resolve();
      },
      rollback: function () {
        return Promise.resolve();
      },
    };
  },
};
