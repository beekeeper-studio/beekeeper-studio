import { IPlatformInfo } from "../IPlatformInfo";
import rawLog from '@bksLogger'

const log = rawLog.scope('utilityPlatformInfo')

// why build it again from stratch? We just get it from the environment, thanks main process!
export function utilityPlatformInfo(): IPlatformInfo {
  const result = JSON.parse(process.env.bksPlatformInfo)
  log.info(result)
  return result
}
