import { IPlatformInfo } from "./IPlatformInfo"
import { mainPlatformInfo } from "./platform_info/mainPlatformInfo"
import { utilityPlatformInfo } from "./platform_info/utilityPlatformInfo"
import { isRenderer, isUtility } from "./electronHelpers";

if (isRenderer()) throw new Error("Importing platform_info inside the renderer is banned!")

const result: IPlatformInfo = isUtility() ? utilityPlatformInfo() : mainPlatformInfo()

export default result

