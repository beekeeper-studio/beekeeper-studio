import rawLog from '@bksLogger'
import { BksConfig, BksConfigProvider } from './BksConfigProvider'

const log = rawLog.scope('utilityBksConfig')

// why build it again from stratch? We just get it from the environment, thanks main process!
export function utilityBksConfig(): BksConfig {
  const result = BksConfigProvider.create(JSON.parse(process.env.bksConfigSource), JSON.parse(process.env.bksPlatformInfo))
  log.info(result)
  return result
}
