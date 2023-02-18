/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution")

module.exports = {
  root: true,
  env: {
    node: true,
    // activate “es2020” globals to fix 'BigInt' is not defined
    // https://futurestud.io/tutorials/eslint-how-to-fix-bigint-is-not-defined
    es2020: true,
  },
  ignorePatterns: ["node_modules", "dist", "apps/**/tsconfig.json"],
  plugins: ['@typescript-eslint'],
  extends: [
    "eslint:recommended",
    "plugin:vue/essential",
    "plugin:vue/strongly-recommended",
    "plugin:@typescript-eslint/recommended",
    "@vue/typescript",
    "@vue/eslint-config-typescript"
  ],
  rules: {
    "no-console": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-unused-vars": "off"
  },
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    sourceType: "module",
  },
  overrides: [
    {
      files: [
        "apps/**/tests/**/*.{j,t}s?(x)"
      ],
      env: {
        jest: true
      }
    }
  ]
}
