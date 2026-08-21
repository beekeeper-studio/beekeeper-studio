// Lightweight mock of @beekeeperstudio/ui-kit for unit tests.
//
// The real package ships ESM from its dist/ folder, which Jest does not
// transform (see transformIgnorePatterns), and the unit tests don't exercise
// the live UI components. Only the runtime values imported by studio source
// need stubs here; type-only imports are erased at compile time.
module.exports = {
  openMenu: () => {},
  divider: { type: 'divider', id: 'divider' },
  setClipboard: () => {},
};
