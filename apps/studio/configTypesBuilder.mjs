import fs from "fs";
import dtsGen from "dts-gen";
import path from "path";
import ini from "ini";
import configTransformer from "./configTransformer.js";

function resolveRootPath() {
  const __dirname = path.resolve();
  const dirpath = path.resolve(__dirname);
  if (dirpath.includes("node_modules")) {
    return dirpath.split("node_modules")[0];
  }

  return path.resolve(dirpath, "../..");
}

const rootPath = resolveRootPath();

const rawConfig = fs.readFileSync(
  path.join(rootPath, "default.config.ini"),
  "utf-8"
);
const config = configTransformer.transform(ini.parse(rawConfig));

const result = dtsGen
  .generateIdentifierDeclarationFile("IBkConfig", config)
  .replace("declare const IBkConfig:", "declare interface IBkConfig");

fs.writeFileSync(
  path.join(rootPath, "apps/studio/src/typings/bkconfig.d.ts"),
  result
);
