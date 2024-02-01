import { readFileSync, writeFileSync } from "fs";
import { generateIdentifierDeclarationFile } from "dts-gen";
import * as path from "path";
import { parse } from "ini";

/** Deep clone an object and cast the values to string or number */
function deepClone(obj) {
  const clone = Object.assign({}, obj);
  Object.keys(clone).forEach((key) => {
    if (typeof obj[key] === "object") {
      clone[key] = deepClone(obj[key]);
    } else if (Number.isNaN(Number(obj[key]))) {
      clone[key] = obj[key];
    } else {
      clone[key] = Number(obj[key]);
    }
  });
  return clone;
}

const __dirname = path.resolve();

const rawConfig = readFileSync(
  path.join(__dirname, "default.config.ini"),
  "utf-8"
);
const config = deepClone(parse(rawConfig));

const result = generateIdentifierDeclarationFile("IBkConfig", config);
const postResult = result.replace(
  "declare const IBkConfig:",
  "declare interface IBkConfig"
);

writeFileSync(path.join(__dirname, "src/typings/bkconfig.d.ts"), postResult);
