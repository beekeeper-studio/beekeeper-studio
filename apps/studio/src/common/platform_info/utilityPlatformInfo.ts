import { IPlatformInfo } from "../IPlatformInfo";

// The utility process gets the resolved platformInfo (including logLevel)
// from main as a JSON env var when it's forked. No rebuilding needed.
export function utilityPlatformInfo(): IPlatformInfo {
  return JSON.parse(process.env.bksPlatformInfo)
}
