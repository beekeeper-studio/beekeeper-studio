import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const input = "src/index.ts";

export default [
  // ESM build
  {
    input,
    output: {
      file: "dist/index.js",
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outDir: "dist",
      }),
    ],
    external: [],
  },
  {
    input: "src/eventForwarder.ts",
    /** FIXME: this file must be injected from the plugin system automatically */
    output: {
      file: "dist/eventForwarder.js",
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outDir: "dist",
      }),
    ],
    external: [],
  },


  {
    input: "src/internal.ts",
    output: {
      file: "dist/internal.js",
      format: "esm",
    },
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outDir: "dist",
      }),
    ],
    external: [],
  },

  // TypeScript declarations
  {
    input,
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    plugins: [dts()],
    external: [],
  },
  {
    input: "src/internal.ts",
    output: {
      file: "dist/internal.d.ts",
      format: "esm",
    },
    plugins: [dts()],
    external: [],
  },
];
