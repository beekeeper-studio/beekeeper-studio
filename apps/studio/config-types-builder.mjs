import { readFileSync, writeFileSync } from "fs";
import { generateIdentifierDeclarationFile } from "dts-gen";
import * as path from "path";
import { parse } from "ini";
import { transform } from "./config-transformer.js";

const __dirname = path.resolve();

const rawConfig = readFileSync(
  path.join(__dirname, "default.config.ini"),
  "utf-8"
);
const config = transform(parse(rawConfig));

const result = generateIdentifierDeclarationFile("IBkConfig", config);
const postResult = result.replace(
  "declare const IBkConfig:",
  "declare interface IBkConfig"
);

writeFileSync(path.join(__dirname, "src/typings/bkconfig.d.ts"), postResult);
