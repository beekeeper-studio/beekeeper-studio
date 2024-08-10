import platformInfo from './common/platform_info'
import { ConnectionTypes, keymapTypes } from './lib/db/types'

const userDirectory = platformInfo.userDirectory

if (platformInfo.debugEnabled && localStorage) {
  localStorage.debug = platformInfo.DEBUG
}

function hasSshKeysPlug() {
  if (!platformInfo.isSnap) return false;

  try {
    const code = typeof window === 'undefined' ? require('child_process').execSync('snapctl is-connected ssh-keys') : window.main.hasSshKeysPlug();
    return Number(code) === 0
  } catch (error) {
    return false
  }
}

// this is available in vue as `this.$config`
export default {
  ...platformInfo,
  userDirectory,
  snapSshPlug: hasSshKeysPlug(),

  defaults: {
    connectionTypes: ConnectionTypes,
    keymapTypes: keymapTypes
  },
  maxResults: 50000,
}
