import fs from "fs";
import dtsgen from "dts-gen";
import path from "path";
import ini from "ini";
import util from "./config-transformer.js";

const { transform } = util;
const { readFileSync, writeFileSync } = fs
const { generateIdentifierDeclarationFile } = dtsgen

const __dirname = path.resolve();

const rawConfig = readFileSync(
  path.join(__dirname, "default.config.ini"),
  "utf-8"
);
const config = transform(ini.parse(rawConfig));

const result = generateIdentifierDeclarationFile("IBkConfig", config);
const postResult = result.replace(
  "declare const IBkConfig:",
  "declare interface IBkConfig"
);

writeFileSync(path.join(__dirname, "src/typings/bkconfig.d.ts"), postResult);
