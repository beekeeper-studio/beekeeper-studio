/* eslint-disable @typescript-eslint/no-var-requires --
 * This file is run by `node` so we won't need to use imports
 **/

const { readFileSync, writeFileSync } = require("fs");
const { generateIdentifierDeclarationFile } = require("dts-gen");
const path = require("path");
const ini = require("ini");

const rawConfig = readFileSync(
  path.join(__dirname, "default.config.ini"),
  "utf-8"
);
const config = ini.parse(rawConfig);
const result = generateIdentifierDeclarationFile("IBkConfig", config);
const postResult = result.replace(
  "declare const IBkConfig:",
  "declare interface IBkConfig"
);

writeFileSync(path.join(__dirname, "src/typings/bkconfig.d.ts"), postResult);
