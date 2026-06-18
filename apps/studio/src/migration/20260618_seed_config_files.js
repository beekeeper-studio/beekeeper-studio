import fs from 'fs'
import path from 'path'
import platformInfo from '@/common/platform_info'
import rawLog from '@bksLogger'

// First-run seeding of the bundled config files into the user directory. The
// app always reads `default.config.ini` straight from the bundled resources, so
// this copy is purely for reference/editing convenience — `user.config.ini` is
// the template users edit to override defaults. No schema change.
//
// This replaces the old copy-on-read behaviour in mainBksConfig, which failed
// with ENOENT when the user directory (or destination file) did not yet exist.
// See issue #4405. Each file is copied only when the bundled source exists (so
// this no-ops in dev, where the resources path has no inis) and the destination
// is missing (so a file a user intentionally deleted is not recreated).
const log = rawLog.scope('migration:seed-config-files')

const CONFIG_FILES = ['default.config.ini', 'user.config.ini']

export default {
  name: '20260618_seed_config_files',
  async run() {
    try {
      fs.mkdirSync(platformInfo.userDirectory, { recursive: true })
    } catch (e) {
      log.warn(`Failed to create user directory ${platformInfo.userDirectory}:`, e)
      return
    }

    for (const file of CONFIG_FILES) {
      const src = path.join(platformInfo.resourcesPath, file)
      const dest = path.join(platformInfo.userDirectory, file)
      try {
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest)
        }
      } catch (e) {
        log.warn(`Failed to seed ${file}:`, e)
      }
    }
  },
}
