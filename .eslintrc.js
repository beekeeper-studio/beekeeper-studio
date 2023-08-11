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
    "@vue/typescript",
    "@vue/eslint-config-typescript"
  ],
  "rules": {
    "no-console": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "no-explicit-any": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "vue/require-prop-types": "off",
    "vue/require-default-prop": "off",
    "@typescript-eslint/no-non-null-assertion": "off"
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
      "files": [
        "apps/**/tests/**/*.{j,t}s?(x)"
      ],
      "env": {
        "jest": true
      }
    }
  ]
}
