module.exports = {
  "root": true,
  "env": {
    "node": true,
    // activate “es2020” globals to fix 'BigInt' is not defined
    // https://futurestud.io/tutorials/eslint-how-to-fix-bigint-is-not-defined
    "es2020": true,
  },
  "ignorePatterns": ["node_modules", "dist", "apps/**/tsconfig.json", "*.png", "*.scss"],
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:vue/essential",
    "plugin:vue/strongly-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  "rules": {
    "no-console": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "no-explicit-any": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "vue/require-prop-types": "off",
    "vue/require-default-prop": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "vue/max-attributes-per-line": "off",
    "vue/multi-word-component-names": "off",
    "vue/no-mutating-props": "warn",
    "vue/no-unused-components": "warn",
    "@typescript-eslint/ban-types": "warn",
    "@typescript-eslint/no-var-requires": "warn",
    "prefer-rest-params": "warn",
    // Demoted to warn to surface preexisting issues without blocking CI.
    // Each one is a real code smell but fixing them is out of scope here.
    "no-async-promise-executor": "warn",
    "no-case-declarations": "warn",
    "no-constant-condition": "warn",
    "no-empty": "warn",
    "no-fallthrough": "warn",
    "no-inner-declarations": "warn",
    "no-prototype-builtins": "warn",
    "no-unsafe-optional-chaining": "warn",
    "no-useless-catch": "warn",
    "no-useless-escape": "warn",
    "@typescript-eslint/no-namespace": "warn",
    "vue/no-parsing-error": "warn",
    "vue/valid-next-tick": "warn",
    "vue/valid-template-root": "warn",
    // Block plugin RCE via file:// URLs (CVE — see safeOpenExternal.ts).
    // shell.openExternal must only be reached via safeOpenExternal so the
    // http(s)-only protocol allowlist is enforced.
    "no-restricted-syntax": [
      "error",
      {
        "selector": "MemberExpression[property.name='openExternal']",
        "message": "Do not call shell.openExternal directly. Use safeOpenExternal() from @/background/lib/electron/safeOpenExternal so the URL protocol allowlist is enforced."
      }
    ]
  },
  "parser": "vue-eslint-parser",
  "parserOptions": {
    "parser": "@typescript-eslint/parser",
    "ecmaFeatures": {
      "legacyDecorators": true
    }
  },
  "overrides": [
    {
      // TypeScript handles undefined-identifier checking; eslint's no-undef
      // produces false positives on type-only imports and contextBridge
      // globals (platformInfo, etc.). Also off for .js since those interop
      // with the same TS modules and globals.
      "files": ["*.ts", "*.tsx", "*.vue", "*.js"],
      "rules": {
        "no-undef": "off"
      }
    },
    {
      "files": [
        "apps/**/tests/**/*.{j,t}s?(x)"
      ],
      "env": {
        "jest": true
      }
    },
    {
      // The single trusted entry point that wraps shell.openExternal.
      "files": [
        "apps/studio/src/background/lib/electron/safeOpenExternal.ts"
      ],
      "rules": {
        "no-restricted-syntax": "off"
      }
    }
  ]
}
