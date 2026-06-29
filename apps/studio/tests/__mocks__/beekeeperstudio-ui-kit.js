// Stub for the bare `@beekeeperstudio/ui-kit` entry point, used only in Jest.
//
// The package is ESM (`"type": "module"`) and its package.json `exports["."]`
// field defines only the `import`/`types` conditions, which Jest's CommonJS
// resolver cannot satisfy (it requests `require`/`default`/`node`), producing
// "Cannot find module '@beekeeperstudio/ui-kit'". The subpath exports
// (e.g. `@beekeeperstudio/ui-kit/vue/text-editor`) are plain string mappings
// and resolve from the built dist, so only the bare specifier needs stubbing.
//
// Unit tests that statically import components depending on the bare entry
// (e.g. TabQueryEditor.vue, which uses `divider`) never mount or render them,
// so the actual values are unused. A Proxy returns an inert value for any
// named export so the import resolves without runtime side effects.
module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "__esModule") return true;
      // `divider` and friends are referenced as values; return an inert object.
      return {};
    },
  }
);
