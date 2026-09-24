// Stub for @marimo-team/codemirror-languageserver used only in Jest.
//
// The upstream package is ESM-only and its package.json `exports` field
// defines only the `import` condition, which Jest's default resolver
// cannot satisfy (it requests the `default`/`node` conditions), producing
// ERR_PACKAGE_PATH_NOT_EXPORTED. The unit tests under tests/unit/ don't
// exercise any LSP behavior; they only need the symbols referenced by
// the statically-imported ui-kit text editor bundle to resolve without
// runtime side effects.
module.exports = {
  LanguageServerClient: class {},
  languageServerWithClient: () => [],
  languageServer: () => [],
  LanguageServerPlugin: class {},
  signatureHelpTooltipField: {},
  setSignatureHelpTooltip: () => {},
  suppressSignatureHelp: () => {},
  languageId: {},
  documentUri: {},
};
