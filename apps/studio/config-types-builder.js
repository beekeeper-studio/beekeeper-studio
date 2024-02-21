/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require("fs");
const dtsgen = require("dts-gen");
const path = require("path");
const ini = require("ini");
const util = require("./config-transformer.js");

const { transform } = util;
const { readFileSync, writeFileSync } = fs;
const { generateIdentifierDeclarationFile } = dtsgen;

function resolveRootPath() {
  const dirpath = path.resolve(__dirname);
  if (dirpath.includes("node_modules")) {
    return dirpath.split("node_modules")[0];
  }
  if (process.env.CLI_MODE || process.env.TEST_MODE) {
    return path.resolve(dirpath, "../..");
  }
  return path.resolve(dirpath, "../../..");
}

const rootPath = resolveRootPath();

const rawConfig = readFileSync(
  path.join(rootPath, "default.config.ini"),
  "utf-8"
);
const config = transform(ini.parse(rawConfig));

const result = generateIdentifierDeclarationFile("IBkConfig", config);
const postResult = result.replace(
  "declare const IBkConfig:",
  "declare interface IBkConfig"
);

writeFileSync(
  path.join(rootPath, "apps/studio/src/typings/bkconfig.d.ts"),
  postResult
);
