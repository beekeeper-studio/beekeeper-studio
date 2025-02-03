import { BkConfig } from "./bkConfig/BkConfigProvider";
import { mainBkConfig } from "./bkConfig/mainBkConfig";
import { utilityBkConfig } from "./bkConfig/utilityBkConfig";
import { isUtility, isRenderer } from "./electronHelpers";

if (isRenderer())
  throw new Error("Importing bkConfig inside the renderer is banned!");

const result: BkConfig = isUtility() ? utilityBkConfig() : mainBkConfig();

export default result;
