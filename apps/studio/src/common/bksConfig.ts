import { BksConfig } from "./bksConfig/BksConfigProvider";
import { mainBksConfig } from "./bksConfig/mainBksConfig";
import { utilityBksConfig } from "./bksConfig/utilityBksConfig";
import { isUtility, isRenderer } from "./electronHelpers";

if (isRenderer())
  throw new Error("Importing bksConfig inside the renderer is banned!");

const result: BksConfig = isUtility() ? utilityBksConfig() : mainBksConfig();

export default result;
