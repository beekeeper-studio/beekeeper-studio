import { IPlatformInfo } from './common/IPlatformInfo';
import { ConnectionTypes, keymapTypes } from './lib/db/types'
import globals from '@/common/globals'

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

function applyDevPlatformOverrides(config: IPlatformInfo): IPlatformInfo {
  if (!config.isDevelopment) return config
  const simulated = localStorage.getItem('dev.simulatePlatform')
  if (!simulated) return config
  return {
    ...config,
    isSnap: simulated === 'snap' ? 'true' : '',
    isFlatpak: simulated === 'flatpak',
  }
}

export function buildConfig(platInfo: IPlatformInfo) {
  platformInfo = applyDevPlatformOverrides(platInfo);
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
    maxResults: globals.maxResults
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
}
