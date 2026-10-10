import { BksConfig } from "./bksConfig/BksConfigProvider";
import { loadBksConfigSource, mainBksConfig } from "./bksConfig/mainBksConfig";
import { isRenderer } from "./electronHelpers";

if (isRenderer())
  throw new Error("Importing bksConfig inside the renderer is banned!");

const result: BksConfig = mainBksConfig();

export function reloadBksConfig(): BksConfig {
  result.reload(loadBksConfigSource());
  return result;
}

export default result;
