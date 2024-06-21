import { execSync } from 'child_process'
import platformInfo from './common/platform_info'
import { loadEncryptionKey } from './common/encryption_key'
import { ConnectionTypes, keymapTypes } from './common/appdb/models/saved_connection'

const userDirectory = platformInfo.userDirectory

if (platformInfo.debugEnabled && localStorage) {
  localStorage.debug = platformInfo.DEBUG
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
    keymapTypes: keymapTypes
  },
  maxResults: 50000,
}
