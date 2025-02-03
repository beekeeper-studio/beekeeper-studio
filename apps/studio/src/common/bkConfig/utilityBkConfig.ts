import rawLog from '@bksLogger'
import { BkConfig, BkConfigProvider } from './BkConfigProvider'

const log = rawLog.scope('utilityBkConfig')

// why build it again from stratch? We just get it from the environment, thanks main process!
export function utilityBkConfig(): BkConfig {
  const result = BkConfigProvider.create(JSON.parse(process.env.bkConfigSource), JSON.parse(process.env.bksPlatformInfo))
  log.info(result)
  return result
}
