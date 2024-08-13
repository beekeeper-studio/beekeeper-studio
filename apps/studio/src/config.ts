import { IPlatformInfo } from './common/IPlatformInfo';
import { ConnectionTypes, keymapTypes } from './lib/db/types'

let platformInfo: IPlatformInfo;
let userDirectory: string;
let snapSshPlug: boolean;

function hasSshKeysPlug() {
  if (!platformInfo.isSnap) return false;

  try {
    const code = window.main.hasSshKeysPlug();
    return Number(code) === 0
  } catch (error) {
    return false
  }
}

export function initConfig() {
  platformInfo = window.platformInfo;
  userDirectory = platformInfo.userDirectory
  snapSshPlug = hasSshKeysPlug();

  if (platformInfo.debugEnabled && localStorage) {
    localStorage.debug = platformInfo.DEBUG
  }
  
}

// this is available in vue as `this.$config`
export default {
  ...platformInfo,
  userDirectory,
  snapSshPlug,

  defaults: {
    connectionTypes: ConnectionTypes,
    keymapTypes: keymapTypes
  },
  maxResults: 50000,
}
