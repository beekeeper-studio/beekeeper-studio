import { IPlatformInfo } from "./IPlatformInfo"
import { mainPlatformInfo } from "./platform_info/mainPlatformInfo"
import { utilityPlatformInfo } from "./platform_info/utilityPlatformInfo"

function isRenderer() {
  // running in a web browser
  if (typeof process === 'undefined') return true

  // node-integration is disabled
  if (!process) return true

  // We're in node.js somehow
  if (!process.type) return false

  return process.type === 'renderer'
}

function isUtility() {
  return process.type === 'utility'
}

if (isRenderer()) throw new Error("Importing platform_info inside the renderer is banned!")

const result: IPlatformInfo = isUtility() ? utilityPlatformInfo() : mainPlatformInfo()

export default result

