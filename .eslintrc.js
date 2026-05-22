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
    // Bug-catching rules: errors so the build fails when real bugs land.
    "no-async-promise-executor": "error",
    "no-case-declarations": "error",
    // checkLoops off: intentional `while (true)` loops are allowed; constant
    // conditions in `if`/ternaries are still caught.
    "no-constant-condition": ["error", { "checkLoops": false }],
    // allowEmptyCase: empty `case` grouping is intentional, not a fallthrough
    // bug; a case with statements falling through is still caught.
    "no-fallthrough": ["error", { "allowEmptyCase": true }],
    "no-inner-declarations": "error",
    "no-prototype-builtins": "error",
    "no-unsafe-optional-chaining": "error",
    "no-self-compare": "error",
    "no-constructor-return": "error",
    "no-template-curly-in-string": "error",
    "array-callback-return": "error",
    "vue/no-parsing-error": "error",
    "vue/valid-next-tick": "error",
    "vue/valid-template-root": "error",
    // Likely-bug rules kept as warn: real signal, but too many existing hits
    // (or occasional intentional uses) to fail CI on.
    "eqeqeq": ["error", "smart"],
    "no-unused-expressions": ["warn", { "allowShortCircuit": true, "allowTernary": true, "allowTaggedTemplates": true }],
    "no-return-assign": "warn",
    "no-sequences": "warn",
    // Style/code-smell rules: kept as warn so they don't block CI.
    "no-empty": "warn",
    "no-useless-catch": "warn",
    "no-useless-escape": "warn",
    "@typescript-eslint/no-namespace": "warn",
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
      },
      "rules": {
        // Test fixtures embed shell scripts and config templates that
        // legitimately contain `${...}` substitution syntax.
        "no-template-curly-in-string": "off"
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
    },
    {
      // Renders nothing by design; the empty template root is intentional.
      "files": [
        "apps/studio/src/components/EmptyComponent.vue"
      ],
      "rules": {
        "vue/valid-template-root": "off"
      }
    }
  ]
}
