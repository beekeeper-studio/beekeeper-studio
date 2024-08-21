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

export function buildConfig(platInfo: IPlatformInfo) {
  platformInfo = platInfo;
  userDirectory = platformInfo.userDirectory
  snapSshPlug = hasSshKeysPlug();

  if (platformInfo.debugEnabled && localStorage) {
    localStorage.debug = platformInfo.DEBUG
  }

  return {
    ...platformInfo,
    snapSshPlug,
    defaults: {
      connectionTypes: ConnectionTypes,
      keymapTypes: keymapTypes,
    },
    maxResults: 50000
  }
  
}

// this is available in vue as `this.$config`
export default {
  ...window.platformInfo,
  userDirectory,
  snapSshPlug,

  defaults: {
    connectionTypes: ConnectionTypes,
    keymapTypes: keymapTypes
  },
  maxResults: 50000,
}
