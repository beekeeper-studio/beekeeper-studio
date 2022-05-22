import { remote } from 'electron'
import { execSync } from 'child_process'
import platformInfo from './common/platform_info'
import { loadEncryptionKey } from './common/encryption_key'
import { ConnectionTypes } from './common/appdb/models/saved_connection'

const userDirectory = platformInfo.userDirectory

if (remote?.process?.env?.DEBUG) {
  localStorage.debug = remote.process.env.DEBUG
}

function hasSshKeysPlug() {
  if (!platformInfo.isSnap) return false;

  try {
    const code = execSync('snapctl is-connected ssh-keys')
    return Number(code) === 0
  } catch (error) {
    return false
  }
}

// this is available in vue as `this.$config`
export default {
  ...platformInfo,
  userDirectory,
  encryptionKey: loadEncryptionKey(),
  snapSshPlug: hasSshKeysPlug(),

  defaults: {
    connectionTypes: ConnectionTypes,
  },
  maxResults: 50000
}
